'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAssets, useCreatePost } from '@aurastream/api-client';
import { cn } from '@/lib/utils';

const Spinner = () => (
  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24" aria-hidden="true">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
  </svg>
);

const CheckIcon = () => (
  <svg className="w-6 h-6 text-interactive-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);

// Sanitize a single tag: lowercase, replace spaces/underscores with hyphens, remove invalid chars
const sanitizeTag = (tag: string): string => {
  return tag
    .toLowerCase()
    .trim()
    .replace(/[\s_]+/g, '-')      // Replace spaces and underscores with hyphens
    .replace(/[^a-z0-9-]/g, '')   // Remove any non-alphanumeric except hyphens
    .replace(/-+/g, '-')          // Collapse multiple hyphens
    .replace(/^-|-$/g, '')        // Remove leading/trailing hyphens
    .slice(0, 30);                // Max 30 chars per tag
};

// Parse comma-separated tags input into sanitized array
const parseTags = (input: string): string[] => {
  return input
    .split(',')
    .map(sanitizeTag)
    .filter(tag => tag.length > 0)
    .slice(0, 5);
};

export default function ShareAssetPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedAssetId = searchParams.get('assetId');
  
  const { data: assetsData, isLoading: assetsLoading } = useAssets({ limit: 50 });
  const createPostMutation = useCreatePost();

  const [selectedAsset, setSelectedAsset] = useState<any>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [showPrompt, setShowPrompt] = useState(false);
  const [errors, setErrors] = useState<{ title?: string; submit?: string }>({});


  // Auto-select asset from URL parameter
  useEffect(() => {
    if (preselectedAssetId && assetsData?.assets) {
      const asset = assetsData.assets.find((a: any) => a.id === preselectedAssetId);
      if (asset && !selectedAsset) {
        setSelectedAsset(asset);
        // Pre-fill title with formatted asset type
        const formattedType = asset.assetType?.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()) || '';
        setTitle(formattedType);
        // Pre-fill tags with sanitized asset type
        setTagsInput(sanitizeTag(asset.assetType || ''));
      }
    }
  }, [preselectedAssetId, assetsData?.assets, selectedAsset]);

  const validate = () => {
    const newErrors: { title?: string } = {};
    if (!title.trim()) newErrors.title = 'Title is required';
    else if (title.length > 100) newErrors.title = 'Title must be 100 characters or less';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAsset || !validate()) return;
    
    setErrors(prev => ({ ...prev, submit: undefined }));
    
    createPostMutation.mutate({
      assetId: selectedAsset.id, 
      title: title.trim(), 
      description: description.trim() || undefined,
      tags: parseTags(tagsInput), 
      showPrompt,
    }, { 
      onSuccess: (post) => router.push(`/community/${post.id}`),
      onError: (error) => {
        console.error('Share to community failed:', error);
        setErrors(prev => ({ 
          ...prev, 
          submit: error instanceof Error ? error.message : 'Failed to share. Please try again.' 
        }));
      }
    });
  };

  const assets = assetsData?.assets || [];
  const tags = parseTags(tagsInput);
  const isSubmitting = createPostMutation.isPending;
  const inputClass = 'w-full px-3 py-2 rounded-lg border bg-background-surface text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-interactive-500 focus:border-transparent disabled:opacity-50';

  return (
    <div className="min-h-screen bg-background-base">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-text-primary mb-2">Share to Community</h1>
        <p className="text-text-muted mb-8">Select an asset and add details to share with the community.</p>

        {/* Asset Selector Grid */}
        <div className="mb-8">
          <h2 className="text-sm font-medium text-text-primary mb-3">Select an Asset</h2>
          {assetsLoading ? (
            <div className="flex items-center justify-center h-48 bg-background-surface rounded-xl border border-border-subtle"><Spinner /></div>
          ) : assets.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 bg-background-surface rounded-xl border border-border-subtle">
              <p className="text-text-muted">No assets yet. Generate some assets first!</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
              {assets.map((asset: any) => (
                <button key={asset.id} type="button" onClick={() => setSelectedAsset(asset)}
                  className={cn('relative aspect-square rounded-xl overflow-hidden border-2 transition-all hover:border-interactive-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-interactive-500',
                    selectedAsset?.id === asset.id ? 'border-interactive-500 ring-2 ring-interactive-500/30' : 'border-border-subtle')}>
                  <img src={asset.url} alt={asset.assetType} className="w-full h-full object-cover" />
                  {selectedAsset?.id === asset.id && (
                    <div className="absolute inset-0 bg-interactive-500/20 flex items-center justify-center">
                      <div className="bg-white rounded-full p-1"><CheckIcon /></div>
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>


        {/* Form */}
        {selectedAsset && (
          <form onSubmit={handleSubmit} className="space-y-5 bg-background-surface rounded-xl border border-border-subtle p-6">
            {/* Selected Asset Preview */}
            <div className="flex items-center gap-4 pb-4 border-b border-border-subtle">
              <div className="w-20 h-20 rounded-lg overflow-hidden bg-background-elevated">
                <img src={selectedAsset.url} alt="Selected" className="w-full h-full object-cover" />
              </div>
              <div>
                <p className="text-sm font-medium text-text-primary capitalize">{selectedAsset.assetType?.replace('_', ' ')}</p>
                <p className="text-xs text-text-muted">{selectedAsset.width}×{selectedAsset.height}</p>
              </div>
            </div>

            {/* Title Input */}
            <div className="space-y-1.5">
              <label htmlFor="share-title" className="block text-sm font-medium text-text-primary">Title <span className="text-red-500">*</span></label>
              <input id="share-title" type="text" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={100}
                placeholder="Give your asset a title" disabled={isSubmitting} className={cn(inputClass, errors.title ? 'border-red-500' : 'border-border-subtle')} />
              <div className="flex justify-between text-xs">
                {errors.title ? <span className="text-red-500">{errors.title}</span> : <span>&nbsp;</span>}
                <span className="text-text-muted">{title.length}/100</span>
              </div>
            </div>

            {/* Description Textarea */}
            <div className="space-y-1.5">
              <label htmlFor="share-description" className="block text-sm font-medium text-text-primary">Description <span className="text-text-muted">(optional)</span></label>
              <textarea id="share-description" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={500} rows={3}
                placeholder="Tell others about this asset..." disabled={isSubmitting} className={cn(inputClass, 'resize-none border-border-subtle')} />
              <div className="flex justify-end text-xs text-text-muted">{description.length}/500</div>
            </div>

            {/* Tags Input */}
            <div className="space-y-1.5">
              <label htmlFor="share-tags" className="block text-sm font-medium text-text-primary">
                Tags <span className="text-text-muted">(optional, comma-separated)</span>
              </label>
              <input id="share-tags" type="text" value={tagsInput} onChange={(e) => setTagsInput(e.target.value)}
                placeholder="gaming, twitch, emote" disabled={isSubmitting} className={cn(inputClass, 'border-border-subtle')} />
              <p className="text-xs text-text-muted">Type anything - we'll format it automatically</p>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {tags.map((tag) => (
                    <span key={tag} className="px-2.5 py-1 text-xs bg-interactive-500/10 text-interactive-600 rounded-full font-medium">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Show Prompt Checkbox */}
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={showPrompt} onChange={(e) => setShowPrompt(e.target.checked)} disabled={isSubmitting}
                className="w-4 h-4 rounded border-border-subtle text-interactive-500 focus:ring-interactive-500 focus:ring-offset-0 disabled:opacity-50" />
              <span className="text-sm text-text-secondary">Show prompt publicly</span>
            </label>

            {/* Error Message */}
            {errors.submit && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                <p className="text-sm text-red-500">{errors.submit}</p>
              </div>
            )}

            {/* Submit Button */}
            <button type="submit" disabled={isSubmitting || !title.trim()}
              className="w-full px-4 py-2.5 rounded-lg font-medium text-sm transition-colors bg-interactive-500 text-white hover:bg-interactive-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-interactive-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
              {isSubmitting ? (<><Spinner /><span>Sharing...</span></>) : 'Share to Community'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
