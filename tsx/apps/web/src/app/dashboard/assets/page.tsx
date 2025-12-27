'use client';

import { useState, useMemo, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  useAssets,
  useJobs,
  useOptimisticAssetDeletion,
  useOptimisticBulkAssetDeletion,
} from '@aurastream/api-client';
import {
  PageContainer,
  AssetCard,
  JobCard,
  SearchInput,
  FilterDropdown,
  ViewToggle,
  EmptyState,
  LoadingState,
  ErrorState,
  AssetPreview,
  ConfirmDialog,
  LibraryIcon,
  TrashIcon,
  DownloadIcon,
} from '@/components/dashboard';
import { toast } from '@/components/ui/Toast';
import type { ViewMode } from '@/components/dashboard';
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
  const router = useRouter();
  const searchParams = useSearchParams();
  const jobIdParam = searchParams.get('job');
  const assetIdParam = searchParams.get('asset');

  // State
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [selectedAssets, setSelectedAssets] = useState<Set<string>>(new Set());
  const [previewAsset, setPreviewAsset] = useState<any>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; type: 'single' | 'bulk' } | null>(null);

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
    const link = document.createElement('a');
    link.href = asset.url;
    link.download = `${asset.asset_type}-${asset.id}.png`;
    link.click();
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
        <LoadingState message="Loading assets..." />
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
              selectable
              onSelect={toggleAssetSelection}
              onClick={() => openPreview(asset)}
              onDownload={() => handleDownload(asset)}
              onDelete={() => setDeleteConfirm({ id: asset.id, type: 'single' })}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<LibraryIcon className="w-8 h-8" />}
          title="No assets found"
          description={search || typeFilter ? 'Try adjusting your filters' : 'Create your first asset to see it here'}
          action={!search && !typeFilter ? { label: 'Create Asset', href: '/dashboard/create' } : undefined}
        />
      )}

      {/* Recent Jobs Section */}
      {!jobIdParam && jobs.length > 0 && (
        <div className="mt-8">
          <h2 className="text-sm font-medium text-text-tertiary uppercase tracking-wider mb-4">Recent Jobs</h2>
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
    </PageContainer>
  );
}
