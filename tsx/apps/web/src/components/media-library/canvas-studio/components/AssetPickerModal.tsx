/**
 * Asset Picker Modal
 * 
 * Sub-modal for selecting assets from the media library OR community hub.
 * Users can switch between their personal library and pre-loaded community assets.
 * Now includes inline upload functionality for quick asset additions.
 */

'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { cn } from '@/lib/utils';
import { 
  useMediaLibrary, 
  useCommunityHubAssets, 
  useCommunityHubCategories,
  communityHubAssetToMediaAsset,
  useUploadMedia,
  shouldRemoveBackgroundByDefault,
  canRemoveBackground,
  type MediaAsset, 
  type MediaAssetType 
} from '@aurastream/api-client';
import { XIcon, ImageIcon } from '../icons';
import { ASSET_TYPE_ICONS, ASSET_TYPE_COLORS } from '../../constants';
import { showSuccessToast, showErrorToast } from '@/utils/errorMessages';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const AVAILABLE_ASSET_TYPES: MediaAssetType[] = [
  'face', 'logo', 'character', 'background', 'reference', 'object', 'game_skin'
];

type PickerTab = 'library' | 'community' | 'upload';

// Upload state interface
interface UploadState {
  file: File | null;
  preview: string | null;
  displayName: string;
  assetType: MediaAssetType;
  removeBackground: boolean;
}

// Icons
function LibraryIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function GlobeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}

function GamepadIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="6" y1="12" x2="10" y2="12" />
      <line x1="8" y1="10" x2="8" y2="14" />
      <line x1="15" y1="13" x2="15.01" y2="13" />
      <line x1="18" y1="11" x2="18.01" y2="11" />
      <rect x="2" y="6" width="20" height="12" rx="2" />
    </svg>
  );
}

function UploadIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}

function SparklesIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z" />
    </svg>
  );
}

interface AssetPickerModalProps {
  isOpen: boolean;
  currentAssets: MediaAsset[];
  filterType: MediaAssetType | undefined;
  onFilterChange: (type: MediaAssetType | undefined) => void;
  onAddAsset: (asset: MediaAsset) => void;
  onClose: () => void;
}

export function AssetPickerModal({
  isOpen,
  currentAssets,
  filterType,
  onFilterChange,
  onAddAsset,
  onClose,
}: AssetPickerModalProps) {
  const [activeTab, setActiveTab] = useState<PickerTab>('library');
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>();
  
  // Upload state
  const [uploadState, setUploadState] = useState<UploadState>({
    file: null,
    preview: null,
    displayName: '',
    assetType: filterType || 'reference',
    removeBackground: false,
  });
  
  const uploadMutation = useUploadMedia();

  // Personal library query
  const { data: library, isLoading: libraryLoading, refetch: refetchLibrary } = useMediaLibrary({
    assetType: filterType,
    limit: 50,
    sortBy: 'usage_count',
    sortOrder: 'desc',
  });

  // Community hub queries
  const { data: categories } = useCommunityHubCategories();
  const { data: communityAssets, isLoading: communityLoading } = useCommunityHubAssets({
    gameCategory: selectedCategory,
    assetType: filterType,
    limit: 50,
  });
  
  // Dropzone for upload
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const f = acceptedFiles[0];
    if (!f) return;

    if (f.size > MAX_FILE_SIZE) {
      showErrorToast({ code: 'FILE_TOO_LARGE', message: 'File must be under 10MB' });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const assetType = filterType || 'reference';
      setUploadState({
        file: f,
        preview: reader.result as string,
        displayName: f.name.replace(/\.[^/.]+$/, ''),
        assetType,
        removeBackground: shouldRemoveBackgroundByDefault(assetType),
      });
    };
    reader.readAsDataURL(f);
  }, [filterType]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.webp', '.gif'] },
    maxFiles: 1,
    maxSize: MAX_FILE_SIZE,
  });
  
  const handleUpload = async () => {
    if (!uploadState.file || !uploadState.preview) return;

    try {
      const base64 = uploadState.preview.split(',')[1];
      const result = await uploadMutation.mutateAsync({
        assetType: uploadState.assetType,
        displayName: uploadState.displayName || uploadState.file.name,
        imageBase64: base64,
        removeBackground: canRemoveBackground(uploadState.assetType) ? uploadState.removeBackground : false,
      });

      showSuccessToast('Asset uploaded!', {
        description: `"${result.asset.displayName}" added to your library`,
      });

      // Add the uploaded asset to canvas immediately
      onAddAsset(result.asset);
      
      // Reset upload state and switch to library
      setUploadState({
        file: null,
        preview: null,
        displayName: '',
        assetType: filterType || 'reference',
        removeBackground: false,
      });
      setActiveTab('library');
      
      // Refetch library to show new asset
      refetchLibrary();
    } catch (err) {
      showErrorToast(err);
    }
  };
  
  const clearUpload = () => {
    setUploadState({
      file: null,
      preview: null,
      displayName: '',
      assetType: filterType || 'reference',
      removeBackground: false,
    });
  };

  if (!isOpen) return null;

  const isLoading = activeTab === 'library' ? libraryLoading : communityLoading;
  const assets = activeTab === 'library' 
    ? library?.assets || []
    : communityAssets?.assets.map(communityHubAssetToMediaAsset) || [];

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      <div className="relative w-full max-w-3xl bg-background-surface rounded-2xl border border-border-subtle shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border-subtle">
          <div>
            <h3 className="font-semibold text-text-primary">Add Assets</h3>
            <p className="text-sm text-text-muted">
              Select from your library or browse community assets
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-background-elevated"
          >
            <XIcon />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-border-subtle">
          <button
            onClick={() => setActiveTab('library')}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors',
              activeTab === 'library'
                ? 'text-interactive-500 border-b-2 border-interactive-500 bg-interactive-500/5'
                : 'text-text-muted hover:text-text-primary hover:bg-background-elevated'
            )}
          >
            <LibraryIcon />
            My Library
          </button>
          <button
            onClick={() => setActiveTab('upload')}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors',
              activeTab === 'upload'
                ? 'text-interactive-500 border-b-2 border-interactive-500 bg-interactive-500/5'
                : 'text-text-muted hover:text-text-primary hover:bg-background-elevated'
            )}
          >
            <UploadIcon />
            Upload
          </button>
          <button
            onClick={() => setActiveTab('community')}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors',
              activeTab === 'community'
                ? 'text-interactive-500 border-b-2 border-interactive-500 bg-interactive-500/5'
                : 'text-text-muted hover:text-text-primary hover:bg-background-elevated'
            )}
          >
            <GlobeIcon />
            Community Hub
            <span className="px-1.5 py-0.5 text-xs rounded-full bg-emerald-500/20 text-emerald-400">
              New
            </span>
          </button>
        </div>

        {/* Community Hub: Coming Soon Banner (when no categories) */}
        {activeTab === 'community' && (!categories || categories.length === 0) && (
          <div className="flex items-center gap-3 p-3 border-b border-border-subtle bg-gradient-to-r from-purple-500/5 to-interactive-500/5">
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 text-xs font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              Coming Soon
            </div>
            <p className="text-sm text-text-muted">
              Game categories and assets are being added. Stay tuned!
            </p>
          </div>
        )}

        {/* Community Hub: Game Category Filter */}
        {activeTab === 'community' && categories && categories.length > 0 && (
          <div className="flex gap-2 p-3 border-b border-border-subtle overflow-x-auto bg-background-elevated/30">
            <button
              onClick={() => setSelectedCategory(undefined)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors',
                !selectedCategory
                  ? 'bg-interactive-500 text-white'
                  : 'bg-background-surface text-text-muted hover:bg-background-elevated'
              )}
            >
              <GamepadIcon />
              All Games
            </button>
            {categories.map((cat) => (
              <button
                key={cat.slug}
                onClick={() => setSelectedCategory(cat.slug)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors relative',
                  selectedCategory === cat.slug
                    ? 'text-white'
                    : 'bg-background-surface text-text-muted hover:bg-background-elevated'
                )}
                style={{
                  backgroundColor: selectedCategory === cat.slug ? (cat.color || '#6366f1') : undefined,
                }}
              >
                {cat.name}
                {cat.assetCount > 0 ? (
                  <span className="text-xs opacity-70">({cat.assetCount})</span>
                ) : (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-medium">
                    Soon
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        {/* Type Filter - Only show for library/community tabs */}
        {activeTab !== 'upload' && (
          <div className="flex gap-2 p-4 border-b border-border-subtle overflow-x-auto">
            <button
              onClick={() => onFilterChange(undefined)}
              className={cn(
                'px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors',
                !filterType
                  ? 'bg-interactive-500 text-white'
                  : 'bg-background-elevated text-text-muted hover:bg-background-surface'
              )}
            >
              All
            </button>
            {AVAILABLE_ASSET_TYPES.map((type) => (
            <button
              key={type}
              onClick={() => onFilterChange(type)}
              className={cn(
                'px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors flex items-center gap-1.5',
                filterType === type
                  ? 'bg-interactive-500 text-white'
                  : 'bg-background-elevated text-text-muted hover:bg-background-surface'
              )}
            >
              <span>{ASSET_TYPE_ICONS[type]}</span>
              <span className="capitalize">{type.replace('_', ' ')}</span>
            </button>
          ))}
          </div>
        )}

        {/* Upload Tab Content */}
        {activeTab === 'upload' && (
          <div className="p-4 max-h-[50vh] overflow-y-auto">
            {!uploadState.preview ? (
              /* Dropzone */
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
                    <UploadIcon />
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
              /* Upload Form */
              <div className="space-y-4">
                {/* Preview */}
                <div className="relative rounded-xl overflow-hidden bg-background-elevated">
                  <img src={uploadState.preview} alt="Preview" className="w-full max-h-48 object-contain" />
                  <button
                    onClick={clearUpload}
                    className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 text-white hover:bg-black/80 transition-colors"
                  >
                    <XIcon />
                  </button>
                </div>

                {/* Display Name */}
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1.5">Name</label>
                  <input
                    type="text"
                    value={uploadState.displayName}
                    onChange={(e) => setUploadState(s => ({ ...s, displayName: e.target.value }))}
                    placeholder="My awesome asset"
                    className="w-full px-3 py-2 rounded-lg border border-border-subtle bg-background-elevated text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-interactive-500/30"
                  />
                </div>

                {/* Asset Type */}
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1.5">Type</label>
                  <div className="flex flex-wrap gap-2">
                    {AVAILABLE_ASSET_TYPES.map((type) => (
                      <button
                        key={type}
                        onClick={() => setUploadState(s => ({ 
                          ...s, 
                          assetType: type,
                          removeBackground: shouldRemoveBackgroundByDefault(type),
                        }))}
                        className={cn(
                          'px-3 py-1.5 rounded-full text-sm transition-colors flex items-center gap-1.5',
                          uploadState.assetType === type
                            ? 'bg-interactive-500 text-white'
                            : 'bg-background-elevated text-text-muted hover:bg-background-surface'
                        )}
                      >
                        <span>{ASSET_TYPE_ICONS[type]}</span>
                        <span className="capitalize">{type.replace('_', ' ')}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Background Removal Toggle */}
                {canRemoveBackground(uploadState.assetType) && (
                  <label className="flex items-center gap-3 p-3 rounded-lg border border-border-subtle bg-background-elevated/50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={uploadState.removeBackground}
                      onChange={(e) => setUploadState(s => ({ ...s, removeBackground: e.target.checked }))}
                      className="w-4 h-4 rounded border-border-subtle text-interactive-500 focus:ring-interactive-500/30"
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
                        Automatically remove the background for transparent compositing
                      </p>
                    </div>
                  </label>
                )}

                {/* Upload Button */}
                <button
                  onClick={handleUpload}
                  disabled={!uploadState.displayName || uploadMutation.isPending}
                  className={cn(
                    'w-full px-4 py-2.5 rounded-lg font-medium transition-colors',
                    !uploadState.displayName || uploadMutation.isPending
                      ? 'bg-interactive-500/50 text-white/50 cursor-not-allowed'
                      : 'bg-interactive-500 text-white hover:bg-interactive-600'
                  )}
                >
                  {uploadMutation.isPending ? 'Uploading...' : 'Upload & Add to Canvas'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Asset Grid - Only show for library/community tabs */}
        {activeTab !== 'upload' && (
        <div className="p-4 max-h-[50vh] overflow-y-auto">
          {isLoading ? (
            <div className="grid grid-cols-4 gap-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="aspect-square rounded-lg bg-background-elevated animate-pulse" />
              ))}
            </div>
          ) : assets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="p-4 rounded-full bg-gradient-to-br from-purple-500/20 to-interactive-500/20 mb-4">
                {activeTab === 'community' ? <GlobeIcon /> : <ImageIcon />}
              </div>
              {activeTab === 'community' ? (
                <>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 text-xs font-medium mb-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                    Coming Soon
                  </div>
                  <p className="text-text-primary font-medium">
                    {selectedCategory 
                      ? `${categories?.find(c => c.slug === selectedCategory)?.name || 'This game'} assets coming soon!`
                      : 'Community assets are on the way!'
                    }
                  </p>
                  <p className="text-sm text-text-muted mt-1 max-w-xs">
                    We&apos;re adding new game assets regularly. Check back soon for characters, backgrounds, and more!
                  </p>
                  <div className="flex gap-2 mt-4">
                    {categories && categories.length > 0 && selectedCategory && (
                      <button
                        onClick={() => setSelectedCategory(undefined)}
                        className="px-3 py-1.5 rounded-lg text-sm bg-background-elevated text-text-muted hover:bg-background-surface transition-colors"
                      >
                        Browse All Games
                      </button>
                    )}
                    <button
                      onClick={() => setActiveTab('library')}
                      className="px-3 py-1.5 rounded-lg text-sm bg-interactive-500/10 text-interactive-400 hover:bg-interactive-500/20 transition-colors"
                    >
                      Use My Library
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-text-muted">No assets found</p>
                  <p className="text-sm text-text-tertiary mt-1">
                    Upload an asset to get started
                  </p>
                  <button
                    onClick={() => setActiveTab('upload')}
                    className="mt-3 px-4 py-2 rounded-lg text-sm bg-interactive-500 text-white hover:bg-interactive-600 transition-colors flex items-center gap-2"
                  >
                    <UploadIcon />
                    Upload Asset
                  </button>
                </>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-3">
              {assets.map((asset) => {
                const isAdded = currentAssets.some(a => a.id === asset.id);

                return (
                  <button
                    key={asset.id}
                    onClick={() => {
                      if (!isAdded) {
                        onAddAsset(asset);
                      }
                    }}
                    disabled={isAdded}
                    className={cn(
                      'relative aspect-square rounded-lg overflow-hidden border-2 transition-all',
                      isAdded
                        ? 'border-emerald-500 ring-2 ring-emerald-500/30 opacity-75'
                        : 'border-transparent hover:border-interactive-500'
                    )}
                  >
                    <img
                      src={asset.thumbnailUrl || asset.url}
                      alt={asset.displayName}
                      className="w-full h-full object-cover"
                    />

                    {/* Type Badge */}
                    <div className={cn(
                      'absolute top-1 left-1 px-1.5 py-0.5 rounded text-xs',
                      ASSET_TYPE_COLORS[asset.assetType]
                    )}>
                      {ASSET_TYPE_ICONS[asset.assetType]}
                    </div>

                    {/* Community Badge */}
                    {asset.userId === 'community' && (
                      <div className="absolute top-1 right-1 px-1.5 py-0.5 rounded text-xs bg-purple-500/80 text-white">
                        <GlobeIcon />
                      </div>
                    )}

                    {/* Added Indicator */}
                    {isAdded && (
                      <div className="absolute inset-0 bg-emerald-500/20 flex items-center justify-center">
                        <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center">
                          ✓
                        </div>
                      </div>
                    )}

                    {/* Name Overlay */}
                    <div className="absolute bottom-0 inset-x-0 p-1.5 bg-gradient-to-t from-black/80 to-transparent">
                      <p className="text-xs text-white truncate">{asset.displayName}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-border-subtle bg-background-elevated/50">
          <p className="text-sm text-text-muted">
            {currentAssets.length} asset{currentAssets.length !== 1 ? 's' : ''} added
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-interactive-500 text-white hover:bg-interactive-600 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
