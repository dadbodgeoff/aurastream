'use client';

import { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { cn } from '@/lib/utils';
import { 
  useUploadMedia, 
  MEDIA_ASSET_TYPES, 
  MEDIA_ASSET_TYPE_LABELS,
  shouldRemoveBackgroundByDefault,
  canRemoveBackground,
} from '@aurastream/api-client';
import { ASSET_TYPE_ICONS, MAX_FILE_SIZE } from './constants';
import { showSuccessToast, showErrorToast } from '@/utils/errorMessages';
import type { MediaUploadModalProps } from './types';
import type { MediaAssetType } from '@aurastream/api-client';

function XIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}

function UploadIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}

function ImageIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <path d="M21 15l-5-5L5 21" />
    </svg>
  );
}

function SparklesIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z" />
      <path d="M5 19l.5 1.5L7 21l-1.5.5L5 23l-.5-1.5L3 21l1.5-.5L5 19z" />
      <path d="M19 5l.5 1.5L21 7l-1.5.5L19 9l-.5-1.5L17 7l1.5-.5L19 5z" />
    </svg>
  );
}

export function MediaUploadModal({
  isOpen,
  onClose,
  defaultAssetType,
  onSuccess,
}: MediaUploadModalProps) {
  const [assetType, setAssetType] = useState<MediaAssetType>(defaultAssetType || 'reference');
  const [displayName, setDisplayName] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [isFavorite, setIsFavorite] = useState(false);
  const [setAsPrimary, setSetAsPrimary] = useState(false);
  const [removeBackground, setRemoveBackground] = useState<boolean>(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);

  const uploadMutation = useUploadMedia();
  
  // Update removeBackground default when asset type changes
  useEffect(() => {
    setRemoveBackground(shouldRemoveBackgroundByDefault(assetType));
  }, [assetType]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const f = acceptedFiles[0];
    if (!f) return;

    if (f.size > MAX_FILE_SIZE) {
      showErrorToast({ code: 'FILE_TOO_LARGE', message: 'File must be under 10MB' });
      return;
    }

    setFile(f);
    setDisplayName(f.name.replace(/\.[^/.]+$/, ''));
    
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(f);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.webp', '.gif'] },
    maxFiles: 1,
    maxSize: MAX_FILE_SIZE,
  });

  const handleSubmit = async () => {
    if (!file || !preview) return;

    try {
      const base64 = preview.split(',')[1];
      const result = await uploadMutation.mutateAsync({
        assetType,
        displayName: displayName || file.name,
        description: description || undefined,
        imageBase64: base64,
        tags: tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : undefined,
        isFavorite,
        setAsPrimary,
        removeBackground: canRemoveBackground(assetType) ? removeBackground : false,
      });

      showSuccessToast('Asset uploaded!', {
        description: result.asset.hasBackgroundRemoved 
          ? `"${result.asset.displayName}" added with background removed`
          : `"${result.asset.displayName}" added to your library`,
      });

      onSuccess?.(result.asset);
      handleClose();
    } catch (err) {
      showErrorToast(err);
    }
  };

  const handleClose = () => {
    setFile(null);
    setPreview(null);
    setDisplayName('');
    setDescription('');
    setTags('');
    setIsFavorite(false);
    setSetAsPrimary(false);
    setRemoveBackground(shouldRemoveBackgroundByDefault(assetType));
    onClose();
  };
  
  const bgRemovalAllowed = canRemoveBackground(assetType);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />
      
      {/* Modal */}
      <div className="relative w-full max-w-2xl bg-background-surface rounded-2xl border border-border-subtle shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border-subtle">
          <h2 className="text-lg font-semibold text-text-primary">Upload Media Asset</h2>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-background-elevated transition-colors"
          >
            <XIcon />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Dropzone */}
          {!preview ? (
            <div
              {...getRootProps()}
              className={cn(
                'relative cursor-pointer rounded-xl border-2 border-dashed p-8 transition-all',
                isDragActive
                  ? 'border-interactive-500 bg-interactive-500/10'
                  : 'border-border-default hover:border-border-strong hover:bg-background-elevated/50'
              )}
            >
              <input {...getInputProps()} />
              <div className="flex flex-col items-center gap-3 text-center">
                <div className={cn(
                  'p-3 rounded-full transition-colors',
                  isDragActive ? 'bg-interactive-500/20 text-interactive-400' : 'bg-background-elevated text-text-secondary'
                )}>
                  {isDragActive ? <ImageIcon /> : <UploadIcon />}
                </div>
                <div>
                  <p className={cn('font-medium', isDragActive ? 'text-interactive-300' : 'text-text-primary')}>
                    {isDragActive ? 'Drop it here!' : 'Drop your image here'}
                  </p>
                  <p className="text-sm text-text-tertiary mt-1">or click to browse</p>
                </div>
                <div className="flex gap-2 mt-2">
                  {['PNG', 'JPG', 'WebP', 'GIF'].map((type) => (
                    <span key={type} className="px-2 py-1 text-xs font-mono text-text-tertiary bg-background-elevated/50 rounded">
                      {type}
                    </span>
                  ))}
                  <span className="px-2 py-1 text-xs text-text-tertiary">Max 10MB</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="relative rounded-xl overflow-hidden bg-background-elevated">
              <img src={preview} alt="Preview" className="w-full max-h-64 object-contain" />
              <button
                onClick={() => { setFile(null); setPreview(null); }}
                className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 text-white hover:bg-black/80 transition-colors"
              >
                <XIcon />
              </button>
            </div>
          )}

          {/* Asset Type */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">Asset Type</label>
            <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
              {MEDIA_ASSET_TYPES.map((type) => (
                <button
                  key={type}
                  onClick={() => setAssetType(type)}
                  className={cn(
                    'flex flex-col items-center gap-1 p-2 rounded-lg border text-xs transition-colors',
                    assetType === type
                      ? 'bg-interactive-500/20 border-interactive-500 text-interactive-400'
                      : 'bg-background-elevated border-border-subtle text-text-muted hover:border-border-default'
                  )}
                  title={MEDIA_ASSET_TYPE_LABELS[type]}
                >
                  <span className="text-lg">{ASSET_TYPE_ICONS[type]}</span>
                  <span className="truncate w-full text-center">{type.split('_')[0]}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Display Name */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">Display Name</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="My awesome asset"
              className="w-full px-3 py-2 rounded-lg border border-border-subtle bg-background-elevated text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-interactive-500/30"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">Description (optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add notes about this asset..."
              rows={2}
              className="w-full px-3 py-2 rounded-lg border border-border-subtle bg-background-elevated text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-interactive-500/30 resize-none"
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">Tags (comma-separated)</label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="gaming, dark, neon"
              className="w-full px-3 py-2 rounded-lg border border-border-subtle bg-background-elevated text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-interactive-500/30"
            />
          </div>

          {/* Options */}
          <div className="space-y-3">
            {/* Background Removal Toggle */}
            <div className={cn(
              'p-3 rounded-lg border transition-colors',
              bgRemovalAllowed 
                ? 'border-border-subtle bg-background-elevated/50' 
                : 'border-border-subtle/50 bg-background-elevated/30 opacity-60'
            )}>
              <label className={cn(
                'flex items-start gap-3',
                bgRemovalAllowed ? 'cursor-pointer' : 'cursor-not-allowed'
              )}>
                <input
                  type="checkbox"
                  checked={removeBackground && bgRemovalAllowed}
                  onChange={(e) => bgRemovalAllowed && setRemoveBackground(e.target.checked)}
                  disabled={!bgRemovalAllowed}
                  className="mt-0.5 w-4 h-4 rounded border-border-subtle text-interactive-500 focus:ring-interactive-500/30 disabled:opacity-50"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-text-primary">Remove background</span>
                    <span className="flex items-center gap-1 px-1.5 py-0.5 text-xs rounded bg-interactive-500/20 text-interactive-400">
                      <SparklesIcon />
                      AI
                    </span>
                  </div>
                  <p className="text-xs text-text-muted mt-0.5">
                    {bgRemovalAllowed 
                      ? 'Automatically remove the background for transparent compositing'
                      : `Background removal not available for ${assetType.replace('_', ' ')} assets`
                    }
                  </p>
                </div>
              </label>
            </div>
            
            {/* Other Options */}
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isFavorite}
                  onChange={(e) => setIsFavorite(e.target.checked)}
                  className="w-4 h-4 rounded border-border-subtle text-interactive-500 focus:ring-interactive-500/30"
                />
                <span className="text-sm text-text-primary">Add to favorites</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={setAsPrimary}
                  onChange={(e) => setSetAsPrimary(e.target.checked)}
                  className="w-4 h-4 rounded border-border-subtle text-interactive-500 focus:ring-interactive-500/30"
                />
                <span className="text-sm text-text-primary">Set as primary for this type</span>
              </label>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-border-subtle bg-background-elevated/50">
          <button
            onClick={handleClose}
            className="px-4 py-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-background-elevated transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!file || !displayName || uploadMutation.isPending}
            className={cn(
              'px-4 py-2 rounded-lg font-medium transition-colors',
              !file || !displayName || uploadMutation.isPending
                ? 'bg-interactive-500/50 text-white/50 cursor-not-allowed'
                : 'bg-interactive-500 text-white hover:bg-interactive-600'
            )}
          >
            {uploadMutation.isPending ? 'Uploading...' : 'Upload Asset'}
          </button>
        </div>
      </div>
    </div>
  );
}
