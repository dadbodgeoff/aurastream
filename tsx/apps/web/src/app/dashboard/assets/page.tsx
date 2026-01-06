'use client';

import { useState, useMemo, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  useAssets,
  useJobs,
  useOptimisticAssetDeletion,
  useOptimisticBulkAssetDeletion,
} from '@aurastream/api-client';
import { useAuth } from '@aurastream/shared';
import {
  PageContainer,
  AssetCard,
  JobCard,
  SearchInput,
  FilterDropdown,
  ViewToggle,
  EmptyState,
  ErrorState,
  AssetPreview,
  ConfirmDialog,
  LibraryIcon,
  TrashIcon,
} from '@/components/dashboard';
import { AssetsEmptyState } from '@/components/empty-states';
import { AssetGridSkeleton } from '@/components/ui/skeletons';
import { AsyncErrorBoundary } from '@/components/ErrorBoundary';
import { toast } from '@/components/ui/Toast';
import { downloadAsset, getAssetFilename } from '@/utils/download';
import { AlertAnimationStudio } from '@/components/alert-animation-studio';
import type { ViewMode } from '@/components/dashboard';
import type { SubscriptionTier } from '@aurastream/api-client';
import { cn } from '@/lib/utils';

// =============================================================================
// Constants
// =============================================================================

const ASSET_TYPE_OPTIONS = [
  { value: '', label: 'All Types' },
  { value: 'thumbnail', label: 'Thumbnail' },
  { value: 'overlay', label: 'Overlay' },
  { value: 'banner', label: 'Banner' },
  { value: 'story_graphic', label: 'Story Graphic' },
  { value: 'twitch_emote', label: 'Twitch Emote' },
  { value: 'twitch_badge', label: 'Twitch Badge' },
  { value: 'twitch_panel', label: 'Twitch Panel' },
];

// =============================================================================
// Main Page
// =============================================================================

export default function AssetsPage() {
  return (
    <AsyncErrorBoundary 
      resourceName="assets"
      onRefetch={() => window.location.reload()}
    >
      <AssetsPageContent />
    </AsyncErrorBoundary>
  );
}

function AssetsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const jobIdParam = searchParams.get('job');
  const assetIdParam = searchParams.get('asset');
  const { user } = useAuth();

  // State
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [clickToDownload, setClickToDownload] = useState(false);
  const [selectedAssets, setSelectedAssets] = useState<Set<string>>(new Set());
  const [previewAsset, setPreviewAsset] = useState<any>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; type: 'single' | 'bulk' } | null>(null);
  
  // Animation Studio state
  const [animationStudioAsset, setAnimationStudioAsset] = useState<{
    id: string;
    url: string;
    name: string;
  } | null>(null);
  
  // Check if user can animate (Pro or Studio tier)
  const canAnimate = user?.subscriptionTier === 'pro' || user?.subscriptionTier === 'studio';

  // Data fetching
  const { data: assetsData, isLoading: assetsLoading, error: assetsError, refetch: refetchAssets } = useAssets({
    assetType: (typeFilter || undefined) as any,
    limit: 50,
  });
  const { data: jobsData, isLoading: jobsLoading } = useJobs({ limit: 20 });

  // Optimistic deletion mutations with toast feedback
  const deleteMutation = useOptimisticAssetDeletion({
    onError: () => toast.error('Failed to delete asset'),
    onSuccess: () => toast.success('Asset deleted'),
  });

  const bulkDeleteMutation = useOptimisticBulkAssetDeletion({
    onError: (_, count) => toast.error(`Failed to delete ${count} assets`),
    onSuccess: (count) => toast.success(`Deleted ${count} assets`),
  });

  const assets = assetsData?.assets ?? [];
  const jobs = jobsData?.jobs ?? [];

  // Filter assets by search
  const filteredAssets = useMemo(() => {
    if (!search) return assets;
    const searchLower = search.toLowerCase();
    return assets.filter((asset: any) =>
      asset.asset_type?.toLowerCase().includes(searchLower)
    );
  }, [assets, search]);

  // Get job assets if job param is present
  const jobAssets = useMemo(() => {
    if (!jobIdParam) return null;
    return assets.filter((asset: any) => asset.job_id === jobIdParam);
  }, [assets, jobIdParam]);

  // Handle asset selection
  const toggleAssetSelection = useCallback((id: string) => {
    setSelectedAssets(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedAssets(new Set());
  }, []);

  // Handle asset preview
  const openPreview = useCallback((asset: any) => {
    setPreviewAsset(asset);
    router.push(`/dashboard/assets?asset=${asset.id}`, { scroll: false });
  }, [router]);

  const closePreview = useCallback(() => {
    setPreviewAsset(null);
    router.push('/dashboard/assets', { scroll: false });
  }, [router]);

  // Handle download
  const handleDownload = useCallback((asset: any) => {
    const filename = getAssetFilename(asset.asset_type, asset.id, asset.format || 'png');
    downloadAsset({
      url: asset.url,
      filename,
      onSuccess: () => toast.success('Download started'),
      onError: (error) => toast.error(`Download failed: ${error.message}`),
      onShowIOSInstructions: () => toast.info('Long-press the image and tap "Add to Photos" to save'),
    });
  }, []);

  // Handle animate - open Animation Studio
  const handleAnimate = useCallback((asset: any) => {
    const assetName = asset.asset_type?.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) || 'Asset';
    setAnimationStudioAsset({
      id: asset.id,
      url: asset.url,
      name: assetName,
    });
  }, []);

  // Handle delete
  const handleDelete = useCallback(() => {
    if (!deleteConfirm) return;
    
    if (deleteConfirm.type === 'bulk') {
      // Optimistic bulk deletion - UI updates immediately
      bulkDeleteMutation.mutate(Array.from(selectedAssets));
      clearSelection();
    } else {
      // Optimistic single deletion - UI updates immediately
      deleteMutation.mutate(deleteConfirm.id);
    }
    
    setDeleteConfirm(null);
  }, [deleteConfirm, selectedAssets, deleteMutation, bulkDeleteMutation, clearSelection]);

  // Open preview from URL param
  useMemo(() => {
    if (assetIdParam && assets.length > 0) {
      const asset = assets.find((a: any) => a.id === assetIdParam);
      if (asset && !previewAsset) {
        setPreviewAsset(asset);
      }
    }
  }, [assetIdParam, assets, previewAsset]);

  // Loading state
  if (assetsLoading) {
    return (
      <PageContainer title="Asset Library">
        {/* Filters Skeleton */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="h-10 w-64 bg-white/5 rounded-lg skeleton-shimmer" />
          <div className="flex items-center gap-3">
            <div className="h-10 w-28 bg-white/5 rounded-lg skeleton-shimmer" />
            <div className="h-10 w-20 bg-white/5 rounded-lg skeleton-shimmer" />
          </div>
        </div>
        
        {/* Asset Grid Skeleton */}
        <AssetGridSkeleton count={12} columns={4} />
      </PageContainer>
    );
  }

  // Error state
  if (assetsError) {
    return (
      <PageContainer title="Asset Library">
        <ErrorState
          message="Failed to load assets. Please try again."
          onRetry={() => refetchAssets()}
        />
      </PageContainer>
    );
  }

  const displayAssets = jobAssets ?? filteredAssets;
  const hasSelection = selectedAssets.size > 0;

  return (
    <PageContainer
      title={jobIdParam ? 'Job Assets' : 'Asset Library'}
      description={jobIdParam ? `Assets from job ${jobIdParam.slice(0, 8)}...` : 'All your generated assets in one place'}
      actions={
        hasSelection ? (
          <div className="flex items-center gap-2">
            <span className="text-sm text-text-muted">{selectedAssets.size} selected</span>
            <button
              onClick={() => setDeleteConfirm({ id: '', type: 'bulk' })}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
            >
              <TrashIcon className="w-4 h-4" />
              Delete
            </button>
            <button
              onClick={clearSelection}
              className="px-3 py-2 text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-background-elevated rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        ) : undefined
      }
    >
      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search assets..."
          className="flex-1 max-w-xs"
        />
        <div className="flex items-center gap-3">
          <FilterDropdown
            label="Type"
            options={ASSET_TYPE_OPTIONS}
            value={typeFilter}
            onChange={(v) => setTypeFilter(v as string)}
          />
          <ViewToggle value={viewMode} onChange={setViewMode} />
          {/* Quick Download Toggle */}
          <button
            onClick={() => setClickToDownload(!clickToDownload)}
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
              clickToDownload
                ? 'bg-interactive-600 text-white'
                : 'bg-background-elevated text-text-secondary hover:text-text-primary'
            )}
            title={clickToDownload ? 'Click cards to download' : 'Click cards to preview'}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Quick DL
          </button>
        </div>
      </div>

      {/* Assets Grid/List */}
      {displayAssets.length > 0 ? (
        <div className={cn(
          viewMode === 'grid'
            ? 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4'
            : 'space-y-3'
        )}>
          {displayAssets.map((asset: any) => (
            <AssetCard
              key={asset.id}
              id={asset.id}
              url={asset.url}
              assetType={asset.asset_type}
              width={asset.width}
              height={asset.height}
              fileSize={asset.file_size}
              isPublic={asset.is_public}
              createdAt={asset.created_at}
              selected={selectedAssets.has(asset.id)}
              selectable={!clickToDownload}
              clickToDownload={clickToDownload}
              canAnimate={canAnimate}
              onSelect={toggleAssetSelection}
              onClick={() => openPreview(asset)}
              onDownload={() => handleDownload(asset)}
              onDelete={() => setDeleteConfirm({ id: asset.id, type: 'single' })}
              onAnimate={() => handleAnimate(asset)}
            />
          ))}
        </div>
      ) : search || typeFilter ? (
        <EmptyState
          icon={<LibraryIcon className="w-8 h-8" />}
          title="No assets found"
          description="Try adjusting your filters"
        />
      ) : (
        <AssetsEmptyState
          tier={user?.subscriptionTier as SubscriptionTier}
          onCreateAsset={() => router.push('/dashboard/create')}
          onBrowseTemplates={() => router.push('/dashboard/templates')}
        />
      )}

      {/* Recent Jobs Section */}
      {!jobIdParam && jobs.length > 0 && (
        <div className="mt-10 pt-8 border-t border-border-subtle">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-base font-semibold text-text-primary">Recent Jobs</h2>
            <span className="text-xs text-text-muted">{jobs.length} total</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {jobs.slice(0, 6).map((job: any) => (
              <JobCard
                key={job.id}
                id={job.id}
                assetType={job.asset_type}
                status={job.status}
                progress={job.progress}
                errorMessage={job.error_message}
                createdAt={job.created_at}
                completedAt={job.completed_at}
                onClick={() => router.push(`/dashboard/assets?job=${job.id}`)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Asset Preview Modal */}
      <AssetPreview
        isOpen={!!previewAsset}
        onClose={closePreview}
        asset={previewAsset}
        onDownload={() => previewAsset && handleDownload(previewAsset)}
        onDelete={() => previewAsset && setDeleteConfirm({ id: previewAsset.id, type: 'single' })}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={handleDelete}
        title={deleteConfirm?.type === 'bulk' ? 'Delete Selected Assets' : 'Delete Asset'}
        message={
          deleteConfirm?.type === 'bulk'
            ? `Are you sure you want to delete ${selectedAssets.size} assets? This action cannot be undone.`
            : 'Are you sure you want to delete this asset? This action cannot be undone.'
        }
        confirmLabel="Delete"
        variant="danger"
      />

      {/* Animation Studio Modal */}
      {animationStudioAsset && (
        <AlertAnimationStudio
          isOpen={!!animationStudioAsset}
          onClose={() => setAnimationStudioAsset(null)}
          sourceAsset={animationStudioAsset}
        />
      )}
    </PageContainer>
  );
}
