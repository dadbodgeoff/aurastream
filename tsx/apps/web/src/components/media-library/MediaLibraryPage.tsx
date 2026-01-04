'use client';

import { useState, useCallback, useRef } from 'react';
import { cn } from '@/lib/utils';
import {
  useMediaLibrary,
  useMediaAccess,
  useToggleFavorite,
  useSetPrimary,
  useDeleteMedia,
  useBulkDeleteMedia,
  TOTAL_ASSET_LIMIT,
  type MediaAsset,
  type MediaAssetType,
} from '@aurastream/api-client';
import { MediaGrid } from './MediaGrid';
import { MediaFilters } from './MediaFilters';
import { MediaUploadModal } from './MediaUploadModal';
import { MediaDetailModal } from './MediaDetailModal';
import { MediaLibrarySummary } from './MediaLibrarySummary';
import { showSuccessToast, showErrorToast } from '@/utils/errorMessages';
import { AsyncErrorBoundary } from '@/components/ErrorBoundary';
import type { MediaFilters as MediaFiltersType } from './types';

function PlusIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

function CheckSquareIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="9 11 12 14 22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

export function MediaLibraryPage() {
  return (
    <AsyncErrorBoundary 
      resourceName="Media Library"
      onRefetch={() => window.location.reload()}
    >
      <MediaLibraryPageContent />
    </AsyncErrorBoundary>
  );
}

function MediaLibraryPageContent() {
  const [filters, setFilters] = useState<MediaFiltersType>({
    sortBy: 'created_at',
    sortOrder: 'desc',
  });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectionMode, setSelectionMode] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<MediaAsset | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  
  // Track in-progress operations to prevent race conditions
  const deletingIdsRef = useRef<Set<string>>(new Set());
  const isBulkDeletingRef = useRef(false);

  const { data: access, isLoading: accessLoading } = useMediaAccess();
  const { data, isLoading, error: _queryError, refetch } = useMediaLibrary({
    ...filters,
    limit: 50,
  });

  const toggleFavoriteMutation = useToggleFavorite();
  const setPrimaryMutation = useSetPrimary();
  const deleteMutation = useDeleteMedia();
  const bulkDeleteMutation = useBulkDeleteMedia();

  const handleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    if (!data?.assets) return;
    if (selectedIds.size === data.assets.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(data.assets.map((a) => a.id)));
    }
  }, [data?.assets, selectedIds.size]);

  const handleAssetClick = useCallback((asset: MediaAsset) => {
    setSelectedAsset(asset);
    setDetailModalOpen(true);
  }, []);

  const handleFavorite = useCallback(async (id: string) => {
    // Prevent favorite toggle during delete operations
    if (deletingIdsRef.current.has(id) || isBulkDeletingRef.current) return;
    
    try {
      await toggleFavoriteMutation.mutateAsync(id);
    } catch (err) {
      showErrorToast(err);
    }
  }, [toggleFavoriteMutation]);

  const handleSetPrimary = useCallback(async (id: string) => {
    // Prevent set primary during delete operations
    if (deletingIdsRef.current.has(id) || isBulkDeletingRef.current) return;
    
    try {
      await setPrimaryMutation.mutateAsync(id);
      showSuccessToast('Set as primary');
    } catch (err) {
      showErrorToast(err);
    }
  }, [setPrimaryMutation]);

  const handleDelete = useCallback(async (id: string) => {
    // Prevent concurrent deletes on same asset or during bulk delete
    if (deletingIdsRef.current.has(id) || isBulkDeletingRef.current) return;
    
    deletingIdsRef.current.add(id);
    try {
      await deleteMutation.mutateAsync(id);
      showSuccessToast('Asset deleted');
    } catch (err) {
      showErrorToast(err);
    } finally {
      deletingIdsRef.current.delete(id);
    }
  }, [deleteMutation]);

  const handleBulkDelete = useCallback(async () => {
    if (selectedIds.size === 0 || isBulkDeletingRef.current) return;
    
    isBulkDeletingRef.current = true;
    try {
      const result = await bulkDeleteMutation.mutateAsync(Array.from(selectedIds));
      showSuccessToast(`Deleted ${result.deletedCount} assets`);
      setSelectedIds(new Set());
      setSelectionMode(false);
    } catch (err) {
      showErrorToast(err);
    } finally {
      isBulkDeletingRef.current = false;
    }
  }, [selectedIds, bulkDeleteMutation]);

  const handleTypeClick = useCallback((type: MediaAssetType) => {
    setFilters((prev) => ({ ...prev, assetType: type }));
  }, []);

  const toggleSelectionMode = useCallback(() => {
    setSelectionMode((prev) => !prev);
    if (selectionMode) {
      setSelectedIds(new Set());
    }
  }, [selectionMode]);

  // Access gate for free users
  if (!accessLoading && !access?.hasAccess) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <div className="p-4 rounded-full bg-amber-500/10 mb-6">
          <LockIcon />
        </div>
        <h1 className="text-2xl font-bold text-text-primary mb-2">Media Library</h1>
        <p className="text-text-muted max-w-md mb-6">
          {access?.upgradeMessage || 
            'Upload and manage your own assets to inject into any generation. Available for Pro and Studio subscribers.'}
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <a
            href="/intel/settings?tab=subscription"
            className="px-6 py-3 rounded-lg bg-interactive-500 text-white font-medium hover:bg-interactive-600 transition-colors"
          >
            Upgrade to Pro
          </a>
          <a
            href="/intel"
            className="px-6 py-3 rounded-lg border border-border-subtle text-text-muted hover:text-text-primary hover:border-border-default transition-colors"
          >
            Back to Dashboard
          </a>
        </div>
        <div className="mt-8 p-4 rounded-xl bg-background-surface border border-border-subtle max-w-md">
          <h3 className="font-medium text-text-primary mb-2">What you get with Media Library:</h3>
          <ul className="text-sm text-text-muted space-y-1 text-left">
            <li>• Upload up to {TOTAL_ASSET_LIMIT} custom assets</li>
            <li>• Inject your face, logos, characters into generations</li>
            <li>• Use in Create, Quick Create, Coach, and Thumbnail Recreation</li>
            <li>• Organize with tags and favorites</li>
          </ul>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Media Library</h1>
          <p className="text-text-muted mt-1">
            Your unified asset library for all generations
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={toggleSelectionMode}
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors',
              selectionMode
                ? 'bg-interactive-500/20 border-interactive-500 text-interactive-400'
                : 'bg-background-surface border-border-subtle text-text-muted hover:border-border-default'
            )}
          >
            <CheckSquareIcon />
            <span className="text-sm">{selectionMode ? 'Cancel' : 'Select'}</span>
          </button>
          <button
            onClick={() => setUploadModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-interactive-500 text-white hover:bg-interactive-600 transition-colors"
          >
            <PlusIcon />
            <span>Upload</span>
          </button>
        </div>
      </div>

      {/* Summary */}
      <MediaLibrarySummary onTypeClick={handleTypeClick} />

      {/* Selection Actions */}
      {selectionMode && selectedIds.size > 0 && (
        <div className="flex items-center justify-between p-3 rounded-lg bg-interactive-500/10 border border-interactive-500/20">
          <div className="flex items-center gap-3">
            <button
              onClick={handleSelectAll}
              className="text-sm text-interactive-400 hover:text-interactive-300"
            >
              {selectedIds.size === data?.assets.length ? 'Deselect All' : 'Select All'}
            </button>
            <span className="text-sm text-text-muted">
              {selectedIds.size} selected
            </span>
          </div>
          <button
            onClick={handleBulkDelete}
            disabled={bulkDeleteMutation.isPending}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors"
          >
            <TrashIcon />
            <span>{bulkDeleteMutation.isPending ? 'Deleting...' : 'Delete Selected'}</span>
          </button>
        </div>
      )}

      {/* Filters */}
      <MediaFilters filters={filters} onChange={setFilters} />

      {/* Grid */}
      <MediaGrid
        assets={data?.assets || []}
        isLoading={isLoading}
        selectedIds={selectedIds}
        onSelect={handleSelect}
        onAssetClick={handleAssetClick}
        onFavorite={handleFavorite}
        onSetPrimary={handleSetPrimary}
        onDelete={handleDelete}
        selectionMode={selectionMode}
        emptyMessage={
          filters.assetType
            ? `No ${filters.assetType.replace('_', ' ')} assets found`
            : 'No assets in your library yet'
        }
      />

      {/* Load More */}
      {data?.hasMore && (
        <div className="flex justify-center pt-4">
          <button
            onClick={() => {
              setFilters((prev) => ({
                ...prev,
                // This would need infinite scroll implementation
              }));
            }}
            className="px-6 py-2 rounded-lg border border-border-subtle text-text-muted hover:border-border-default hover:text-text-primary transition-colors"
          >
            Load More
          </button>
        </div>
      )}

      {/* Modals */}
      <MediaUploadModal
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        defaultAssetType={filters.assetType}
        onSuccess={() => refetch()}
      />

      <MediaDetailModal
        asset={selectedAsset}
        isOpen={detailModalOpen}
        onClose={() => {
          setDetailModalOpen(false);
          setSelectedAsset(null);
        }}
        onUpdate={() => refetch()}
        onDelete={() => refetch()}
      />
    </div>
  );
}
