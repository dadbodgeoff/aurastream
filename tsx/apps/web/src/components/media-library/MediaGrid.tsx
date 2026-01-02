'use client';

import { cn } from '@/lib/utils';
import { MediaCard } from './MediaCard';
import type { MediaGridProps } from './types';

function MediaCardSkeleton() {
  return (
    <div className="rounded-xl border border-border-subtle overflow-hidden bg-background-surface animate-pulse">
      <div className="aspect-square bg-background-elevated" />
      <div className="p-3 space-y-2">
        <div className="h-4 bg-background-elevated rounded w-3/4" />
        <div className="flex items-center justify-between">
          <div className="h-5 bg-background-elevated rounded-full w-20" />
          <div className="h-3 bg-background-elevated rounded w-12" />
        </div>
      </div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 mb-4 rounded-full bg-background-elevated flex items-center justify-center">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-text-muted">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <path d="M21 15l-5-5L5 21" />
        </svg>
      </div>
      <p className="text-text-muted text-lg">{message}</p>
      <p className="text-text-tertiary text-sm mt-1">Upload your first asset to get started</p>
    </div>
  );
}

export function MediaGrid({
  assets,
  isLoading = false,
  selectedIds = new Set(),
  onSelect,
  onAssetClick,
  onFavorite,
  onSetPrimary,
  onDelete,
  selectionMode = false,
  emptyMessage = 'No assets found',
  className,
}: MediaGridProps) {
  if (isLoading) {
    return (
      <div className={cn(
        'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4',
        className
      )}>
        {Array.from({ length: 12 }).map((_, i) => (
          <MediaCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (assets.length === 0) {
    return <EmptyState message={emptyMessage} />;
  }

  return (
    <div className={cn(
      'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4',
      className
    )}>
      {assets.map((asset) => (
        <MediaCard
          key={asset.id}
          asset={asset}
          isSelected={selectedIds.has(asset.id)}
          onSelect={() => onSelect?.(asset.id)}
          onClick={() => onAssetClick?.(asset)}
          onFavorite={() => onFavorite?.(asset.id)}
          onSetPrimary={() => onSetPrimary?.(asset.id)}
          onDelete={() => onDelete?.(asset.id)}
          selectionMode={selectionMode}
        />
      ))}
    </div>
  );
}
