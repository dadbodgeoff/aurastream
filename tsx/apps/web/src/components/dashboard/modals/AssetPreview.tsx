'use client';

import { Modal } from './Modal';
import { DownloadIcon, TrashIcon, EyeIcon, EyeOffIcon } from '../icons';
import { cn } from '@/lib/utils';

export interface AssetPreviewProps {
  isOpen: boolean;
  onClose: () => void;
  asset: {
    id: string;
    url: string;
    assetType: string;
    width: number;
    height: number;
    fileSize: number;
    isPublic: boolean;
    createdAt: string | Date;
  } | null;
  onDownload?: () => void;
  onDelete?: () => void;
  onToggleVisibility?: () => void;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatAssetType(type: string): string {
  return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function AssetPreview({
  isOpen,
  onClose,
  asset,
  onDownload,
  onDelete,
  onToggleVisibility,
}: AssetPreviewProps) {
  if (!asset) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={formatAssetType(asset.assetType)}
      size="xl"
      footer={
        <div className="flex items-center gap-2 w-full">
          <div className="flex-1 flex items-center gap-2">
            {onToggleVisibility && (
              <button
                onClick={onToggleVisibility}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-background-elevated rounded-lg transition-colors"
              >
                {asset.isPublic ? <EyeOffIcon size="sm" /> : <EyeIcon size="sm" />}
                {asset.isPublic ? 'Make Private' : 'Make Public'}
              </button>
            )}
            {onDelete && (
              <button
                onClick={onDelete}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
              >
                <TrashIcon size="sm" />
                Delete
              </button>
            )}
          </div>
          {onDownload && (
            <button
              onClick={onDownload}
              className="flex items-center gap-2 px-4 py-2 bg-interactive-600 hover:bg-interactive-500 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <DownloadIcon size="sm" />
              Download
            </button>
          )}
        </div>
      }
    >

      <div className="space-y-4">
        {/* Image Preview */}
        <div className="rounded-xl overflow-hidden bg-background-elevated">
          <img
            src={asset.url}
            alt={formatAssetType(asset.assetType)}
            loading="eager"
            decoding="async"
            className="w-full h-auto max-h-[50vh] object-contain"
          />
        </div>

        {/* Metadata */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-3 bg-background-elevated rounded-lg">
            <p className="text-xs text-text-muted mb-1">Dimensions</p>
            <p className="text-sm font-medium text-text-primary">{asset.width} × {asset.height}</p>
          </div>
          <div className="p-3 bg-background-elevated rounded-lg">
            <p className="text-xs text-text-muted mb-1">File Size</p>
            <p className="text-sm font-medium text-text-primary">{formatFileSize(asset.fileSize)}</p>
          </div>
          <div className="p-3 bg-background-elevated rounded-lg">
            <p className="text-xs text-text-muted mb-1">Visibility</p>
            <p className={cn(
              'text-sm font-medium',
              asset.isPublic ? 'text-emerald-500' : 'text-text-primary'
            )}>
              {asset.isPublic ? 'Public' : 'Private'}
            </p>
          </div>
          <div className="p-3 bg-background-elevated rounded-lg">
            <p className="text-xs text-text-muted mb-1">Created</p>
            <p className="text-sm font-medium text-text-primary">{formatDate(asset.createdAt)}</p>
          </div>
        </div>
      </div>
    </Modal>
  );
}
