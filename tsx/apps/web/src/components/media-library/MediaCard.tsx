'use client';

import { cn } from '@/lib/utils';
import { ASSET_TYPE_ICONS, ASSET_TYPE_COLORS } from './constants';
import type { MediaCardProps } from './types';

function HeartIcon({ filled }: { filled?: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

function StarIcon({ filled }: { filled?: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function SparklesIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z" />
    </svg>
  );
}

export function MediaCard({
  asset,
  isSelected,
  onSelect,
  onClick,
  onFavorite,
  onSetPrimary,
  onDelete,
  selectionMode,
  className,
}: MediaCardProps) {
  const typeColor = ASSET_TYPE_COLORS[asset.assetType];
  const typeIcon = ASSET_TYPE_ICONS[asset.assetType];

  return (
    <div
      onClick={selectionMode ? onSelect : onClick}
      className={cn(
        'group relative rounded-xl border overflow-hidden bg-background-surface transition-all cursor-pointer',
        isSelected
          ? 'border-interactive-500 ring-2 ring-interactive-500/30'
          : 'border-border-subtle hover:border-border-default hover:shadow-lg',
        className
      )}
    >
      {/* Selection Checkbox */}
      {selectionMode && (
        <div
          className={cn(
            'absolute top-2 left-2 z-20 w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all',
            isSelected
              ? 'bg-interactive-500 border-interactive-500 text-white'
              : 'bg-background-surface/80 border-border-default backdrop-blur-sm'
          )}
        >
          {isSelected && <CheckIcon />}
        </div>
      )}

      {/* Primary Badge */}
      {asset.isPrimary && (
        <div className="absolute top-2 right-2 z-10 px-2 py-0.5 text-xs font-semibold bg-amber-500 text-white rounded-full shadow-md flex items-center gap-1">
          <StarIcon filled /> Primary
        </div>
      )}
      
      {/* Background Removed Badge */}
      {asset.hasBackgroundRemoved && !asset.isPrimary && (
        <div className="absolute top-2 right-2 z-10 px-1.5 py-0.5 text-xs bg-interactive-500/90 text-white rounded-full shadow-md flex items-center gap-0.5" title="Background removed">
          <SparklesIcon />
        </div>
      )}

      {/* Image */}
      <div className="relative aspect-square bg-background-elevated overflow-hidden">
        <img
          src={asset.thumbnailUrl || asset.url}
          alt={asset.displayName}
          loading="lazy"
          decoding="async"
          className="w-full h-full object-cover transition-transform group-hover:scale-105"
        />
        
        {/* Hover Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
          {/* Quick Actions */}
          <div className="absolute bottom-2 right-2 flex gap-1">
            {onFavorite && (
              <button
                onClick={(e) => { e.stopPropagation(); onFavorite(); }}
                className={cn(
                  'p-1.5 rounded-lg backdrop-blur-sm transition-colors',
                  asset.isFavorite
                    ? 'bg-rose-500/80 text-white'
                    : 'bg-black/40 text-white hover:bg-black/60'
                )}
                title={asset.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
              >
                <HeartIcon filled={asset.isFavorite} />
              </button>
            )}
            {onSetPrimary && !asset.isPrimary && (
              <button
                onClick={(e) => { e.stopPropagation(); onSetPrimary(); }}
                className="p-1.5 rounded-lg bg-black/40 text-white hover:bg-amber-500/80 backdrop-blur-sm transition-colors"
                title="Set as primary"
              >
                <StarIcon />
              </button>
            )}
            {onDelete && (
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(); }}
                className="p-1.5 rounded-lg bg-black/40 text-white hover:bg-red-500/80 backdrop-blur-sm transition-colors"
                title="Delete"
              >
                <TrashIcon />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-3">
        <h3 className="font-medium text-text-primary truncate text-sm" title={asset.displayName}>
          {asset.displayName}
        </h3>
        
        <div className="flex items-center justify-between mt-2">
          <span className={cn('px-2 py-0.5 text-xs rounded-full border', typeColor)}>
            {typeIcon} {asset.assetType.replace('_', ' ')}
          </span>
          
          {asset.usageCount > 0 && (
            <span className="text-xs text-text-muted">
              Used {asset.usageCount}×
            </span>
          )}
        </div>

        {/* Tags */}
        {asset.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {asset.tags.slice(0, 2).map((tag) => (
              <span key={tag} className="px-1.5 py-0.5 text-xs bg-background-elevated text-text-muted rounded">
                {tag}
              </span>
            ))}
            {asset.tags.length > 2 && (
              <span className="px-1.5 py-0.5 text-xs bg-background-elevated text-text-muted rounded">
                +{asset.tags.length - 2}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
