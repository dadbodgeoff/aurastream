'use client';

/**
 * Intel Brand Kits Page
 * 
 * Brand Studio within the Intel layout - no sidebar, embedded directly.
 */

import { useState, useCallback, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Palette, ArrowLeft, Plus, Sparkles, Wand2 } from 'lucide-react';

import { useBrandKits } from '@aurastream/api-client';
import { VibeBrandingModal } from '@/components/vibe-branding';
import { BrandKitSuite } from '@/components/brand-kit';
import { BrandStudioLanding, QuickSetupWizard } from '@/components/brand-studio';
import { BrandKitCardSkeleton } from '@/components/ui/skeletons';
import { showSuccessToast } from '@/utils/errorMessages';
import { cn } from '@/lib/utils';

type PageView = 'landing' | 'quick-setup' | 'editor';

export default function IntelBrandKitsPage() {
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
      router.replace('/intel/brand-kits');
    }
  }, [searchParams, modeParam, router]);

  // Navigation handlers
  const handleOpenVibeBranding = useCallback(() => {
    setShowVibeBranding(true);
  }, []);

  const handleOpenQuickSetup = useCallback(() => {
    router.push('/intel/brand-kits?new=true');
  }, [router]);

  const handleEditKit = useCallback((id: string) => {
    router.push(`/intel/brand-kits?id=${id}`);
  }, [router]);

  const handleBackToLanding = useCallback(() => {
    router.push('/intel/brand-kits');
  }, [router]);

  const handleQuickSetupComplete = useCallback((brandKitId: string) => {
    router.push('/intel/brand-kits');
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
          router.push(`/intel/brand-kits?id=${kitId}`);
        }
      },
    });
  }, [refetch, router]);

  const brandKits = data?.brandKits ?? [];

  // Loading state
  if (isLoading && view === 'landing') {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-white/5 animate-pulse" />
          <div className="space-y-2">
            <div className="h-6 w-32 bg-white/5 rounded animate-pulse" />
            <div className="h-4 w-48 bg-white/5 rounded animate-pulse" />
          </div>
        </div>
        <div className="h-px bg-white/10" />
        <BrandKitCardSkeleton count={4} />
      </div>
    );
  }

  // Error state
  if (error && view === 'landing') {
    return (
      <div className="space-y-6">
        <Header />
        <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center mb-4">
            <Palette className="w-8 h-8 text-red-400" />
          </div>
          <h3 className="text-lg font-semibold text-text-primary mb-2">Failed to load brand kits</h3>
          <p className="text-sm text-text-secondary mb-4">Something went wrong. Please try again.</p>
          <button
            onClick={() => refetch()}
            className="px-4 py-2 bg-interactive-600 hover:bg-interactive-500 text-white rounded-lg text-sm font-medium transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Editor view
  if (view === 'editor') {
    return (
      <div className="space-y-6">
        {/* Back button */}
        <button
          onClick={handleBackToLanding}
          className="flex items-center gap-2 text-text-secondary hover:text-text-primary text-sm transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          Back to Brand Studio
        </button>
        
        {/* Brand Kit Suite */}
        <BrandKitSuite brandKitId={editingId || undefined} />
      </div>
    );
  }

  // Quick Setup view
  if (view === 'quick-setup') {
    return (
      <div className="space-y-6">
        <Header />
        <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        <div className="max-w-2xl mx-auto">
          <QuickSetupWizard
            onComplete={handleQuickSetupComplete}
            onCancel={handleBackToLanding}
          />
        </div>
      </div>
    );
  }

  // Landing view (default)
  return (
    <div className="space-y-6">
      <Header 
        brandKitCount={brandKits.length}
        onCreateNew={handleOpenQuickSetup}
        onVibeCreate={handleOpenVibeBranding}
      />
      
      <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

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
    </div>
  );
}

// Header component
function Header({ 
  brandKitCount = 0,
  onCreateNew,
  onVibeCreate,
}: { 
  brandKitCount?: number;
  onCreateNew?: () => void;
  onVibeCreate?: () => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-500 via-pink-500 to-purple-600 flex items-center justify-center shadow-lg shadow-pink-600/25 ring-1 ring-white/10">
          <Palette className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-text-primary tracking-tight">Brand Studio</h1>
          <p className="text-sm text-text-secondary mt-0.5">
            {brandKitCount > 0 
              ? `${brandKitCount} brand kit${brandKitCount !== 1 ? 's' : ''} created`
              : 'Create and manage your brand identities'
            }
          </p>
        </div>
      </div>

      {onCreateNew && onVibeCreate && (
        <div className="flex items-center gap-3">
          <button
            onClick={onVibeCreate}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
              'bg-white/5 border border-white/10 text-text-secondary',
              'hover:bg-white/10 hover:text-text-primary hover:border-white/20'
            )}
          >
            <Wand2 className="w-4 h-4" />
            <span className="hidden sm:inline">Vibe Branding</span>
          </button>
          <button
            onClick={onCreateNew}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
              'bg-gradient-to-r from-interactive-600 to-interactive-500',
              'hover:from-interactive-500 hover:to-interactive-400',
              'text-white shadow-lg shadow-interactive-600/25 ring-1 ring-white/10'
            )}
          >
            <Plus className="w-4 h-4" />
            <span>New Brand Kit</span>
          </button>
        </div>
      )}
    </div>
  );
}
