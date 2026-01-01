'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useLongPress } from '@aurastream/shared';
import { ContextMenu } from '@/components/ui/ContextMenu';
import { DownloadIcon, TrashIcon, EyeIcon, EyeOffIcon, CheckIcon } from '../icons';

export interface AssetCardProps {
  id: string;
  url: string;
  assetType: string;
  width: number;
  height: number;
  fileSize: number | null | undefined;
  isPublic: boolean;
  createdAt: string | Date | undefined;
  selected?: boolean;
  selectable?: boolean;
  /** When true, clicking the card triggers download instead of onClick */
  clickToDownload?: boolean;
  onSelect?: (id: string) => void;
  onClick?: () => void;
  onDownload?: () => void;
  onDelete?: () => void;
  onToggleVisibility?: () => void;
  className?: string;
}

function formatFileSize(bytes: number | null | undefined): string {
  if (bytes === null || bytes === undefined || isNaN(bytes)) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatAssetType(type: string | undefined | null): string {
  if (!type) return 'Asset';
  return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

function formatRelativeTime(date: string | Date | undefined | null): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (!d || isNaN(d.getTime())) return '';
  
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
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
  clickToDownload = false,
  onSelect,
  onClick,
  onDownload,
  onDelete,
  onToggleVisibility,
  className,
}: AssetCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [contextMenuOpen, setContextMenuOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });

  // Long press hook for mobile context menu
  const { handlers: longPressHandlers, reset: resetLongPress } = useLongPress({
    onLongPress: (position) => {
      setMenuPosition(position);
      setContextMenuOpen(true);
    },
    duration: 500,
    disabled: selectable, // Disable when in selection mode
  });

  const handleSelect = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect?.(id);
  };

  const handleContextMenuClose = () => {
    setContextMenuOpen(false);
    resetLongPress();
  };

  // Handle card click - either download or custom onClick
  const handleCardClick = () => {
    if (clickToDownload && onDownload) {
      onDownload();
    } else {
      onClick?.();
    }
  };

  // Build context menu items based on available handlers
  const contextMenuItems = [
    ...(onDownload ? [{
      id: 'download',
      label: 'Download',
      icon: <DownloadIcon size="sm" />,
      onClick: () => { onDownload(); handleContextMenuClose(); },
    }] : []),
    ...(onToggleVisibility ? [{
      id: 'visibility',
      label: isPublic ? 'Make Private' : 'Make Public',
      icon: isPublic ? <EyeOffIcon size="sm" /> : <EyeIcon size="sm" />,
      onClick: () => { onToggleVisibility(); handleContextMenuClose(); },
    }] : []),
    ...(onDelete ? [{
      id: 'delete',
      label: 'Delete',
      icon: <TrashIcon size="sm" />,
      onClick: () => { onDelete(); handleContextMenuClose(); },
      variant: 'danger' as const,
    }] : []),
  ];

  return (
    <div
      className={cn(
        'group relative rounded-xl border overflow-hidden transition-all cursor-pointer',
        'shadow-sm hover:shadow-md', // Elevation 1 → 2 on hover
        selected
          ? 'border-interactive-600 ring-2 ring-interactive-600/20'
          : 'border-border-subtle hover:border-border-default',
        clickToDownload && 'hover:scale-105',
        className
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleCardClick}
      {...longPressHandlers}
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
      <AnimatePresence>
        {isHovered && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={cn(
              'absolute inset-0 flex items-end justify-between p-3 transition-opacity',
              clickToDownload 
                ? 'bg-background-surface/80 backdrop-blur-sm items-center justify-center'
                : 'bg-gradient-to-t from-black/60 via-transparent to-transparent'
            )}
          >
            {clickToDownload ? (
              /* Click-to-download mode: centered download button */
              <motion.button
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                onClick={(e) => { e.stopPropagation(); onDownload?.(); }}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white text-background-base font-semibold text-sm hover:bg-neutral-100 transition-colors"
              >
                <DownloadIcon size="sm" />
                Download
              </motion.button>
            ) : (
              /* Standard mode: action buttons at bottom */
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
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Info Footer - Enterprise styling */}
      <div className="p-3 bg-background-surface border-t border-border-subtle">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-sm font-semibold text-text-primary truncate">
              {formatAssetType(assetType)}
            </span>
            {isPublic && (
              <span className="flex-shrink-0 px-1.5 py-0.5 text-micro font-medium bg-emerald-500/10 text-emerald-500 rounded">
                Public
              </span>
            )}
          </div>
          {formatFileSize(fileSize) && (
            <span className="flex-shrink-0 text-xs font-medium text-text-tertiary">
              {formatFileSize(fileSize)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-1.5">
          <span className="text-xs text-text-muted font-mono">
            {width}×{height}
          </span>
          <span className="text-text-muted">·</span>
          <span className="text-xs text-text-muted">
            {formatRelativeTime(createdAt)}
          </span>
        </div>
      </div>

      {/* Context Menu for long-press actions */}
      {contextMenuItems.length > 0 && (
        <ContextMenu
          items={contextMenuItems}
          isOpen={contextMenuOpen}
          onClose={handleContextMenuClose}
          position={menuPosition}
        />
      )}
    </div>
  );
}
