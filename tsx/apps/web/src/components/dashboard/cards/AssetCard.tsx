'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { DownloadIcon, TrashIcon, EyeIcon, EyeOffIcon, CheckIcon } from '../icons';

export interface AssetCardProps {
  id: string;
  url: string;
  assetType: string;
  width: number;
  height: number;
  fileSize: number;
  isPublic: boolean;
  createdAt: string | Date;
  selected?: boolean;
  selectable?: boolean;
  onSelect?: (id: string) => void;
  onClick?: () => void;
  onDownload?: () => void;
  onDelete?: () => void;
  onToggleVisibility?: () => void;
  className?: string;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatAssetType(type: string | undefined | null): string {
  if (!type) return 'Asset';
  return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

export function AssetCard({
  id,
  url,
  assetType,
  width,
  height,
  fileSize,
  isPublic,
  createdAt,
  selected = false,
  selectable = false,
  onSelect,
  onClick,
  onDownload,
  onDelete,
  onToggleVisibility,
  className,
}: AssetCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [imageError, setImageError] = useState(false);

  const handleSelect = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect?.(id);
  };

  return (
    <div
      className={cn(
        'group relative rounded-xl border overflow-hidden transition-all cursor-pointer',
        selected
          ? 'border-interactive-600 ring-2 ring-interactive-600/20'
          : 'border-border-subtle hover:border-border-default',
        className
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
    >

      {/* Selection Checkbox */}
      {selectable && (
        <button
          onClick={handleSelect}
          className={cn(
            'absolute top-2 left-2 z-10 w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all',
            selected
              ? 'bg-interactive-600 border-interactive-600 text-white'
              : 'bg-white/80 border-white/50 hover:border-interactive-600',
            !isHovered && !selected && 'opacity-0 group-hover:opacity-100'
          )}
        >
          {selected && <CheckIcon size="sm" />}
        </button>
      )}

      {/* Image */}
      <div className="aspect-video bg-background-elevated">
        {!imageError ? (
          <img
            src={url}
            alt={formatAssetType(assetType)}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-text-muted">
            <span className="text-sm">Failed to load</span>
          </div>
        )}
      </div>

      {/* Hover Actions */}
      <div className={cn(
        'absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex items-end justify-between p-3 transition-opacity',
        isHovered ? 'opacity-100' : 'opacity-0'
      )}>
        <div className="flex gap-1">
          {onDownload && (
            <button
              onClick={(e) => { e.stopPropagation(); onDownload(); }}
              className="p-2 bg-white/20 hover:bg-white/30 rounded-lg text-white transition-colors"
              title="Download"
            >
              <DownloadIcon size="sm" />
            </button>
          )}
          {onToggleVisibility && (
            <button
              onClick={(e) => { e.stopPropagation(); onToggleVisibility(); }}
              className="p-2 bg-white/20 hover:bg-white/30 rounded-lg text-white transition-colors"
              title={isPublic ? 'Make Private' : 'Make Public'}
            >
              {isPublic ? <EyeIcon size="sm" /> : <EyeOffIcon size="sm" />}
            </button>
          )}
          {onDelete && (
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="p-2 bg-red-500/20 hover:bg-red-500/30 rounded-lg text-white transition-colors"
              title="Delete"
            >
              <TrashIcon size="sm" />
            </button>
          )}
        </div>
      </div>

      {/* Info Footer */}
      <div className="p-3 bg-background-surface border-t border-border-subtle">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-text-primary truncate">
            {formatAssetType(assetType)}
          </span>
          <span className="text-xs text-text-muted">
            {formatFileSize(fileSize)}
          </span>
        </div>
        <div className="flex items-center justify-between mt-1">
          <span className="text-xs text-text-muted">
            {width}×{height}
          </span>
          {isPublic && (
            <span className="text-xs text-emerald-500">Public</span>
          )}
        </div>
      </div>
    </div>
  );
}
