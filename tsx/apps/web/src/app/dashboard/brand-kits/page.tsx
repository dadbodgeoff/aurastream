'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  useBrandKits,
  useOptimisticBrandKitActivation,
  useOptimisticBrandKitDeletion,
} from '@aurastream/api-client';
import { useAuth } from '@aurastream/shared';
import {
  PageContainer,
  BrandKitCard,
  SearchInput,
  EmptyState,
  ErrorState,
  ConfirmDialog,
  PlusIcon,
} from '@/components/dashboard';
import { BrandKitsEmptyState } from '@/components/empty-states';
import { BrandKitCardSkeleton } from '@/components/ui/skeletons';
import { toast } from '@/components/ui/Toast';
import { VibeBrandingModal } from '@/components/vibe-branding';
import { BrandKitSuite } from '@/components/brand-kit';
import { Sparkles, ArrowLeft } from 'lucide-react';
import type { SubscriptionTier } from '@aurastream/api-client';
import { cn } from '@/lib/utils';

export default function BrandKitsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { data, isLoading, error, refetch } = useBrandKits();
  
  // Check URL params for editing or creating
  const editingId = searchParams.get('id');
  const isCreating = searchParams.get('new') === 'true';
  const showSuite = editingId || isCreating;
  
  // Optimistic mutations with toast feedback
  const activateMutation = useOptimisticBrandKitActivation({
    onError: () => toast.error('Failed to activate brand kit'),
    onSuccess: (kit) => toast.success(`${kit.name} is now active`),
  });
  
  const deleteMutation = useOptimisticBrandKitDeletion({
    onError: () => toast.error('Failed to delete brand kit'),
    onSuccess: () => toast.success('Brand kit deleted'),
  });
  
  const [search, setSearch] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [showVibeBranding, setShowVibeBranding] = useState(false);

  // Handle ?vibe=true query param to auto-open modal
  useEffect(() => {
    if (searchParams.get('vibe') === 'true') {
      setShowVibeBranding(true);
      // Clean up URL
      router.replace('/dashboard/brand-kits');
    }
  }, [searchParams, router]);

  const brandKits = data?.brandKits ?? [];
  const filteredBrandKits = search
    ? brandKits.filter((kit: any) => kit.name.toLowerCase().includes(search.toLowerCase()))
    : brandKits;

  const handleActivate = useCallback((id: string) => {
    activateMutation.mutate(id);
  }, [activateMutation]);

  const handleDelete = useCallback(() => {
    if (!deleteConfirm) return;
    deleteMutation.mutate(deleteConfirm);
    setDeleteConfirm(null);
  }, [deleteConfirm, deleteMutation]);

  const handleCreateNew = () => {
    router.push('/dashboard/brand-kits?new=true');
  };

  const handleEditKit = (id: string) => {
    router.push(`/dashboard/brand-kits?id=${id}`);
  };

  const handleBackToList = () => {
    router.push('/dashboard/brand-kits');
  };

  // Show the full Brand Kit Suite when editing or creating
  if (showSuite) {
    return (
      <div className="min-h-screen bg-background-base">
        {/* Back button header */}
        <div className="border-b border-border-subtle bg-background-surface/50">
          <div className="max-w-7xl mx-auto px-4 py-3">
            <button
              onClick={handleBackToList}
              className="flex items-center gap-2 text-text-secondary hover:text-text-primary text-sm transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Brand Kits
            </button>
          </div>
        </div>
        
        {/* Brand Kit Suite */}
        <div className="p-8">
          <BrandKitSuite brandKitId={editingId || undefined} />
        </div>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <PageContainer title="Brand Studio">
        <div className="h-10 w-64 bg-white/5 rounded-lg skeleton-shimmer" />
        <BrandKitCardSkeleton count={6} />
      </PageContainer>
    );
  }

  // Error state
  if (error) {
    return (
      <PageContainer title="Brand Studio">
        <ErrorState
          message="Failed to load brand kits. Please try again."
          onRetry={() => refetch()}
        />
      </PageContainer>
    );
  }

  const canCreateMore = brandKits.length < 10;

  return (
    <PageContainer
      title="Brand Studio"
      description="Manage your brand identities for consistent asset generation"
      actions={
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowVibeBranding(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Sparkles className="w-4 h-4" />
            Import from Image
          </button>
          {canCreateMore ? (
            <button
              onClick={handleCreateNew}
              className="inline-flex items-center gap-2 px-4 py-2 bg-interactive-600 hover:bg-interactive-500 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <PlusIcon className="w-4 h-4" />
              New Brand Kit
            </button>
          ) : (
            <span className="text-sm text-text-muted">Maximum 10 brand kits reached</span>
          )}
        </div>
      }
    >
      {/* Search */}
      {brandKits.length > 0 && (
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search brand kits..."
          className="max-w-xs"
        />
      )}

      {/* Brand Kits Grid */}
      {filteredBrandKits.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredBrandKits.map((kit: any) => (
            <BrandKitCard
              key={kit.id}
              id={kit.id}
              name={kit.name}
              isActive={kit.is_active}
              primaryColors={kit.primary_colors}
              accentColors={kit.accent_colors}
              logoUrl={kit.logo_url}
              tone={kit.tone}
              onClick={() => handleEditKit(kit.id)}
              onActivate={() => handleActivate(kit.id)}
            />
          ))}
        </div>
      ) : search ? (
        <EmptyState
          title="No brand kits found"
          description="Try a different search term"
        />
      ) : (
        <BrandKitsEmptyState
          tier={user?.subscriptionTier as SubscriptionTier}
          onCreateBrandKit={handleCreateNew}
          onLearnMore={() => window.open('/docs/brand-kits', '_blank')}
        />
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={handleDelete}
        title="Delete Brand Kit"
        message="Are you sure you want to delete this brand kit? This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
      />

      {/* Vibe Branding Modal */}
      <VibeBrandingModal
        isOpen={showVibeBranding}
        onClose={() => setShowVibeBranding(false)}
        onKitCreated={() => {
          refetch();
          toast.success('Brand kit created from image!');
        }}
      />
    </PageContainer>
  );
}
