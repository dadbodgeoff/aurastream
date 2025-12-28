'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  useBrandKits,
  useCreateBrandKit,
  useUpdateBrandKit,
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
  Modal,
  PlusIcon,
} from '@/components/dashboard';
import { BrandKitsEmptyState } from '@/components/empty-states';
import { BrandKitCardSkeleton } from '@/components/ui/skeletons';
import { toast } from '@/components/ui/Toast';
import { VibeBrandingModal } from '@/components/vibe-branding';
import { Sparkles } from 'lucide-react';
import type { SubscriptionTier } from '@aurastream/api-client';
import { cn } from '@/lib/utils';

// =============================================================================
// Brand Kit Create/Edit Form
// =============================================================================

interface BrandKitFormProps {
  isOpen: boolean;
  onClose: () => void;
  brandKit?: any;
  onSave: (data: any) => Promise<void>;
}

function BrandKitForm({ isOpen, onClose, brandKit, onSave }: BrandKitFormProps) {
  const [name, setName] = useState(brandKit?.name || '');
  const [tone, setTone] = useState(brandKit?.tone || 'professional');
  const [primaryColors, setPrimaryColors] = useState<string[]>(brandKit?.primary_colors || ['#6366f1']);
  const [accentColors, setAccentColors] = useState<string[]>(brandKit?.accent_colors || ['#f59e0b']);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setIsLoading(true);
    try {
      await onSave({
        name: name.trim(),
        tone,
        primary_colors: primaryColors,
        accent_colors: accentColors,
        fonts: { headline: 'Inter', body: 'Inter' },
      });
      onClose();
    } catch (error) {
      console.error('Failed to save brand kit:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toneOptions = [
    { value: 'professional', label: 'Professional' },
    { value: 'casual', label: 'Casual' },
    { value: 'competitive', label: 'Competitive' },
    { value: 'educational', label: 'Educational' },
    { value: 'comedic', label: 'Comedic' },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={brandKit ? 'Edit Brand Kit' : 'Create Brand Kit'}
      description="Define your brand identity for consistent asset generation"
      size="lg"
      footer={
        <>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-background-elevated rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!name.trim() || isLoading}
            className="px-4 py-2 text-sm font-medium bg-interactive-600 hover:bg-interactive-500 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            {isLoading ? 'Saving...' : brandKit ? 'Save Changes' : 'Create'}
          </button>
        </>
      }
    >
      <div className="space-y-6">
        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">Brand Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="My Gaming Brand"
            className="w-full px-4 py-2.5 bg-background-elevated border border-border-subtle rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-interactive-600 focus:ring-1 focus:ring-interactive-600/20"
          />
        </div>

        {/* Tone */}
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">Brand Tone</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {toneOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setTone(option.value)}
                className={cn(
                  'px-4 py-2.5 text-sm font-medium rounded-lg border transition-colors',
                  tone === option.value
                    ? 'border-interactive-600 bg-interactive-600/10 text-interactive-600'
                    : 'border-border-subtle text-text-secondary hover:border-border-default'
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Primary Colors */}
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">Primary Colors</label>
          <div className="flex items-center gap-2">
            {primaryColors.map((color, index) => (
              <div key={index} className="relative">
                <input
                  type="color"
                  value={color}
                  onChange={(e) => {
                    const newColors = [...primaryColors];
                    newColors[index] = e.target.value;
                    setPrimaryColors(newColors);
                  }}
                  className="w-12 h-12 rounded-lg cursor-pointer border-2 border-border-subtle"
                />
              </div>
            ))}
            {primaryColors.length < 3 && (
              <button
                onClick={() => setPrimaryColors([...primaryColors, '#000000'])}
                className="w-12 h-12 rounded-lg border-2 border-dashed border-border-subtle flex items-center justify-center text-text-muted hover:border-interactive-600 hover:text-interactive-600 transition-colors"
              >
                <PlusIcon className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Accent Colors */}
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">Accent Colors</label>
          <div className="flex items-center gap-2">
            {accentColors.map((color, index) => (
              <div key={index} className="relative">
                <input
                  type="color"
                  value={color}
                  onChange={(e) => {
                    const newColors = [...accentColors];
                    newColors[index] = e.target.value;
                    setAccentColors(newColors);
                  }}
                  className="w-12 h-12 rounded-lg cursor-pointer border-2 border-border-subtle"
                />
              </div>
            ))}
            {accentColors.length < 3 && (
              <button
                onClick={() => setAccentColors([...accentColors, '#000000'])}
                className="w-12 h-12 rounded-lg border-2 border-dashed border-border-subtle flex items-center justify-center text-text-muted hover:border-interactive-600 hover:text-interactive-600 transition-colors"
              >
                <PlusIcon className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}

// =============================================================================
// Main Page
// =============================================================================

export default function BrandKitsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { data, isLoading, error, refetch } = useBrandKits();
  const createBrandKit = useCreateBrandKit();
  const updateBrandKit = useUpdateBrandKit();
  
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
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingBrandKit, setEditingBrandKit] = useState<any>(null);
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

  const handleCreate = useCallback(async (formData: any) => {
    try {
      await createBrandKit.mutateAsync(formData);
      toast.success('Brand kit created');
    } catch (error) {
      console.error('Failed to create brand kit:', error);
      toast.error('Failed to create brand kit');
    }
  }, [createBrandKit]);

  const handleEdit = useCallback(async (formData: any) => {
    if (!editingBrandKit?.id) return;
    try {
      await updateBrandKit.mutateAsync({ id: editingBrandKit.id, data: formData });
      setEditingBrandKit(null);
      toast.success('Brand kit updated');
    } catch (error) {
      console.error('Failed to update brand kit:', error);
      toast.error('Failed to update brand kit');
    }
  }, [editingBrandKit, updateBrandKit]);

  const handleActivate = useCallback((id: string) => {
    // Optimistic activation - UI updates immediately
    activateMutation.mutate(id);
  }, [activateMutation]);

  const handleDelete = useCallback(() => {
    if (!deleteConfirm) return;
    // Optimistic deletion - UI updates immediately
    deleteMutation.mutate(deleteConfirm);
    setDeleteConfirm(null);
  }, [deleteConfirm, deleteMutation]);

  if (isLoading) {
    return (
      <PageContainer title="Brand Studio">
        {/* Search Skeleton */}
        <div className="h-10 w-64 bg-white/5 rounded-lg skeleton-shimmer" />
        
        {/* Brand Kit Cards Skeleton */}
        <BrandKitCardSkeleton count={6} />
      </PageContainer>
    );
  }

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
            className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Sparkles className="w-4 h-4" />
            Import from Image
          </button>
          {canCreateMore ? (
            <button
              onClick={() => setShowCreateForm(true)}
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
              onClick={() => setEditingBrandKit(kit)}
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
          onCreateBrandKit={() => setShowCreateForm(true)}
          onLearnMore={() => window.open('/docs/brand-kits', '_blank')}
        />
      )}

      {/* Create Form Modal */}
      <BrandKitForm
        isOpen={showCreateForm}
        onClose={() => setShowCreateForm(false)}
        onSave={handleCreate}
      />

      {/* Edit Form Modal */}
      <BrandKitForm
        isOpen={!!editingBrandKit}
        onClose={() => setEditingBrandKit(null)}
        brandKit={editingBrandKit}
        onSave={handleEdit}
      />

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
