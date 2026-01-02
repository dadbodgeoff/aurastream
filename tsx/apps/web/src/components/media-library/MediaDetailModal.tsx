'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { useUpdateMedia, useDeleteMedia, MEDIA_ASSET_TYPE_LABELS } from '@aurastream/api-client';
import { ASSET_TYPE_ICONS, ASSET_TYPE_COLORS } from './constants';
import { showSuccessToast, showErrorToast } from '@/utils/errorMessages';
import type { MediaDetailModalProps } from './types';

function XIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}

function HeartIcon({ filled }: { filled?: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

function StarIcon({ filled }: { filled?: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
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

function DownloadIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

function SparklesIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z" />
      <path d="M5 19l.5 1.5L7 21l-1.5.5L5 23l-.5-1.5L3 21l1.5-.5L5 19z" />
      <path d="M19 5l.5 1.5L21 7l-1.5.5L19 9l-.5-1.5L17 7l1.5-.5L19 5z" />
    </svg>
  );
}

function ImageIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <path d="M21 15l-5-5L5 21" />
    </svg>
  );
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function MediaDetailModal({
  asset,
  isOpen,
  onClose,
  onUpdate,
  onDelete,
}: MediaDetailModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showProcessed, setShowProcessed] = useState(true); // Show processed by default if available

  const updateMutation = useUpdateMedia();
  const deleteMutation = useDeleteMedia();

  useEffect(() => {
    if (asset) {
      setDisplayName(asset.displayName);
      setDescription(asset.description || '');
      setTags(asset.tags.join(', '));
      // Default to showing processed version if available
      setShowProcessed(asset.hasBackgroundRemoved && !!asset.processedUrl);
    }
  }, [asset]);

  if (!isOpen || !asset) return null;

  const typeColor = ASSET_TYPE_COLORS[asset.assetType];
  const typeIcon = ASSET_TYPE_ICONS[asset.assetType];
  
  // Determine which image URL to display
  const displayUrl = (showProcessed && asset.processedUrl) ? asset.processedUrl : asset.url;
  const hasProcessedVersion = asset.hasBackgroundRemoved && !!asset.processedUrl;

  const handleSave = async () => {
    try {
      const updated = await updateMutation.mutateAsync({
        assetId: asset.id,
        displayName,
        description: description || undefined,
        tags: tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      });
      showSuccessToast('Asset updated!');
      onUpdate?.(updated);
      setIsEditing(false);
    } catch (err) {
      showErrorToast(err);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync(asset.id);
      showSuccessToast('Asset deleted');
      onDelete?.();
      onClose();
    } catch (err) {
      showErrorToast(err);
    }
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = displayUrl;
    const suffix = (showProcessed && asset.processedUrl) ? '_no_bg' : '';
    link.download = `${asset.displayName}${suffix}`;
    link.click();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      
      {/* Modal */}
      <div className="relative w-full max-w-4xl bg-background-surface rounded-2xl border border-border-subtle shadow-2xl overflow-hidden flex flex-col md:flex-row max-h-[90vh]">
        {/* Image Section */}
        <div className="md:w-1/2 bg-background-elevated flex flex-col">
          <div className="flex-1 flex items-center justify-center p-4">
            <img
              src={displayUrl}
              alt={asset.displayName}
              className="max-w-full max-h-[50vh] md:max-h-[65vh] object-contain rounded-lg"
            />
          </div>
          
          {/* Image Version Toggle */}
          {hasProcessedVersion && (
            <div className="px-4 pb-4">
              <div className="flex items-center justify-center gap-2 p-1 bg-background-surface rounded-lg border border-border-subtle">
                <button
                  onClick={() => setShowProcessed(false)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors',
                    !showProcessed
                      ? 'bg-interactive-500 text-white'
                      : 'text-text-muted hover:text-text-primary'
                  )}
                >
                  <ImageIcon /> Original
                </button>
                <button
                  onClick={() => setShowProcessed(true)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors',
                    showProcessed
                      ? 'bg-interactive-500 text-white'
                      : 'text-text-muted hover:text-text-primary'
                  )}
                >
                  <SparklesIcon /> No Background
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Details Section */}
        <div className="md:w-1/2 flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border-subtle">
            <div className="flex items-center gap-2">
              <span className={cn('px-2 py-1 text-sm rounded-full border', typeColor)}>
                {typeIcon} {MEDIA_ASSET_TYPE_LABELS[asset.assetType]}
              </span>
              {asset.isPrimary && (
                <span className="px-2 py-0.5 text-xs font-semibold bg-amber-500 text-white rounded-full flex items-center gap-1">
                  <StarIcon filled /> Primary
                </span>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-background-elevated transition-colors"
            >
              <XIcon />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {isEditing ? (
              <>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">Name</label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-border-subtle bg-background-elevated text-text-primary focus:outline-none focus:ring-2 focus:ring-interactive-500/30"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">Description</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 rounded-lg border border-border-subtle bg-background-elevated text-text-primary focus:outline-none focus:ring-2 focus:ring-interactive-500/30 resize-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">Tags</label>
                  <input
                    type="text"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    placeholder="tag1, tag2, tag3"
                    className="w-full px-3 py-2 rounded-lg border border-border-subtle bg-background-elevated text-text-primary focus:outline-none focus:ring-2 focus:ring-interactive-500/30"
                  />
                </div>
              </>
            ) : (
              <>
                <div>
                  <h2 className="text-xl font-semibold text-text-primary">{asset.displayName}</h2>
                  {asset.description && (
                    <p className="text-text-muted mt-1">{asset.description}</p>
                  )}
                </div>

                {asset.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {asset.tags.map((tag) => (
                      <span key={tag} className="px-2 py-0.5 text-xs bg-background-elevated text-text-muted rounded-full">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3 text-sm">
                  {asset.width && asset.height && (
                    <div className="p-3 rounded-lg bg-background-elevated">
                      <span className="text-text-muted">Dimensions</span>
                      <p className="font-medium text-text-primary">{asset.width} × {asset.height}</p>
                    </div>
                  )}
                  {asset.fileSize && (
                    <div className="p-3 rounded-lg bg-background-elevated">
                      <span className="text-text-muted">File Size</span>
                      <p className="font-medium text-text-primary">{formatBytes(asset.fileSize)}</p>
                    </div>
                  )}
                  <div className="p-3 rounded-lg bg-background-elevated">
                    <span className="text-text-muted">Usage Count</span>
                    <p className="font-medium text-text-primary">{asset.usageCount} times</p>
                  </div>
                  <div className="p-3 rounded-lg bg-background-elevated">
                    <span className="text-text-muted">Uploaded</span>
                    <p className="font-medium text-text-primary">{formatDate(asset.createdAt)}</p>
                  </div>
                  {asset.hasBackgroundRemoved && (
                    <div className="col-span-2 p-3 rounded-lg bg-interactive-500/10 border border-interactive-500/30">
                      <div className="flex items-center gap-2">
                        <SparklesIcon />
                        <span className="text-sm font-medium text-interactive-400">Background Removed</span>
                      </div>
                      <p className="text-xs text-text-muted mt-1">
                        Both original and transparent versions available
                      </p>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Actions */}
          <div className="p-4 border-t border-border-subtle bg-background-elevated/50">
            {showDeleteConfirm ? (
              <div className="flex items-center justify-between">
                <span className="text-sm text-red-400">Delete this asset?</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="px-3 py-1.5 text-sm rounded-lg text-text-muted hover:bg-background-elevated"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={deleteMutation.isPending}
                    className="px-3 py-1.5 text-sm rounded-lg bg-red-500 text-white hover:bg-red-600"
                  >
                    {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>
            ) : isEditing ? (
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 rounded-lg text-text-muted hover:bg-background-elevated"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={updateMutation.isPending}
                  className="px-4 py-2 rounded-lg bg-interactive-500 text-white hover:bg-interactive-600"
                >
                  {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  <button
                    onClick={handleDownload}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-background-elevated transition-colors"
                  >
                    <DownloadIcon /> Download
                  </button>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    <TrashIcon /> Delete
                  </button>
                  <button
                    onClick={() => setIsEditing(true)}
                    className="px-4 py-2 rounded-lg bg-interactive-500 text-white hover:bg-interactive-600"
                  >
                    Edit
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
