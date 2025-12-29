'use client';

import { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { showSuccessToast, showErrorToast } from '@/utils/errorMessages';

export interface ShareAssetModalProps {
  isOpen: boolean;
  onClose: () => void;
  asset: {
    id: string;
    url: string;
    assetType: string;
    promptUsed?: string;
  } | null;
  onSubmit: (data: {
    assetId: string;
    title: string;
    description?: string;
    tags: string[];
    showPrompt: boolean;
  }) => Promise<void> | void;
  isSubmitting?: boolean;
  onViewPost?: (postId: string) => void;
}

function CloseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function Spinner() {
  return (
    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

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

export function ShareAssetModal({
  isOpen,
  onClose,
  asset,
  onSubmit,
  isSubmitting = false,
  onViewPost,
}: ShareAssetModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [showPrompt, setShowPrompt] = useState(false);
  const [errors, setErrors] = useState<{ title?: string }>({});
  const [validationState, setValidationState] = useState<{ title?: 'valid' | 'invalid' | null }>({});

  // Reset form when modal opens with new asset
  useEffect(() => {
    if (isOpen && asset) {
      setTitle('');
      setDescription('');
      setTagsInput('');
      setShowPrompt(false);
      setErrors({});
      setValidationState({});
    }
  }, [isOpen, asset?.id]);

  // Handle Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isSubmitting) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  const handleOverlayClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !isSubmitting) {
      onClose();
    }
  }, [isSubmitting, onClose]);

  // Inline validation with debounce
  const validateTitle = useCallback((value: string) => {
    if (!value.trim()) {
      setErrors({ title: 'Title is required' });
      setValidationState({ title: 'invalid' });
      return false;
    } else if (value.length > 100) {
      setErrors({ title: 'Title must be 100 characters or less' });
      setValidationState({ title: 'invalid' });
      return false;
    } else if (value.trim().length >= 3) {
      setErrors({});
      setValidationState({ title: 'valid' });
      return true;
    }
    setErrors({});
    setValidationState({ title: null });
    return true;
  }, []);

  // Debounced title validation
  useEffect(() => {
    if (!title) {
      setValidationState({ title: null });
      return;
    }
    const timer = setTimeout(() => {
      validateTitle(title);
    }, 300);
    return () => clearTimeout(timer);
  }, [title, validateTitle]);

  const validate = (): boolean => {
    return validateTitle(title);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!asset || isSubmitting) return;

    if (!validate()) return;

    try {
      await onSubmit({
        assetId: asset.id,
        title: title.trim(),
        description: description.trim() || undefined,
        tags: parseTags(tagsInput),
        showPrompt,
      });
      
      // Show success toast with "View Post" action
      showSuccessToast('Shared to community!', {
        description: 'Your asset is now visible to the community.',
        actionLabel: onViewPost ? 'View Post' : undefined,
        onAction: onViewPost ? () => onViewPost(asset.id) : undefined,
      });
      
      onClose();
    } catch (error: any) {
      // Handle specific community errors
      if (error?.code === 'COMMUNITY_USER_BANNED') {
        showErrorToast({ code: 'COMMUNITY_USER_BANNED' });
        onClose();
      } else {
        showErrorToast(error, {
          onRetry: () => handleSubmit(e),
        });
      }
    }
  };

  if (!isOpen || !asset) return null;

  const tags = parseTags(tagsInput);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={handleOverlayClick}
    >
      <div className="relative w-full max-w-lg mx-4 bg-background-surface rounded-2xl shadow-xl border border-border-subtle overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle">
          <h2 className="text-lg font-semibold text-text-primary">Share to Community</h2>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1 rounded-lg text-text-muted hover:text-text-primary hover:bg-background-elevated transition-colors disabled:opacity-50"
          >
            <CloseIcon />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Form spacing: space-y-5 (20px) for consistent vertical rhythm */}
          {/* Asset Preview */}
          <div className="flex justify-center">
            <div className="relative w-32 h-32 rounded-xl overflow-hidden bg-background-elevated border border-border-subtle">
              <img src={asset.url} alt="Asset preview" className="w-full h-full object-cover" />
            </div>
          </div>
          <p className="text-center text-sm text-text-muted capitalize">{asset.assetType.replace('_', ' ')}</p>

          {/* Title Input with inline validation */}
          <div className="space-y-1.5">
            <label htmlFor="share-title" className="block text-sm font-medium text-text-primary">
              Title <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                id="share-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={100}
                placeholder="Give your asset a title"
                disabled={isSubmitting}
                className={cn(
                  'w-full px-3 py-2 pr-10 rounded-lg border bg-background-surface text-text-primary placeholder:text-text-muted',
                  'focus:outline-none focus:ring-2 focus:ring-interactive-500 focus:border-transparent',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                  errors.title ? 'border-red-500' : validationState.title === 'valid' ? 'border-green-500' : 'border-border-subtle'
                )}
              />
              {/* Validation indicator */}
              {validationState.title === 'valid' && (
                <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-green-500">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
              )}
              {validationState.title === 'invalid' && (
                <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-red-500">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="15" y1="9" x2="9" y2="15" />
                    <line x1="9" y1="9" x2="15" y2="15" />
                  </svg>
                </div>
              )}
            </div>
            <div className="flex justify-between text-xs">
              {errors.title ? (
                <span className="text-red-500">{errors.title}</span>
              ) : validationState.title === 'valid' ? (
                <span className="text-green-500">✓ Looks good!</span>
              ) : (
                <span className="text-text-muted">&nbsp;</span>
              )}
              <span className="text-text-muted">{title.length}/100</span>
            </div>
          </div>

          {/* Description Textarea */}
          <div className="space-y-1.5">
            <label htmlFor="share-description" className="block text-sm font-medium text-text-primary">
              Description <span className="text-text-muted">(optional)</span>
            </label>
            <textarea
              id="share-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={500}
              rows={3}
              placeholder="Tell others about this asset..."
              disabled={isSubmitting}
              className={cn(
                'w-full px-3 py-2 rounded-lg border border-border-subtle bg-background-surface',
                'text-text-primary placeholder:text-text-muted resize-none',
                'focus:outline-none focus:ring-2 focus:ring-interactive-500 focus:border-transparent',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            />
            <div className="flex justify-end text-xs text-text-muted">{description.length}/500</div>
          </div>

          {/* Tags Input */}
          <div className="space-y-1.5">
            <label htmlFor="share-tags" className="block text-sm font-medium text-text-primary">
              Tags <span className="text-text-muted">(optional, comma-separated)</span>
            </label>
            <input
              id="share-tags"
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="gaming, twitch, emote"
              disabled={isSubmitting}
              className={cn(
                'w-full px-3 py-2 rounded-lg border border-border-subtle bg-background-surface text-text-primary placeholder:text-text-muted',
                'focus:outline-none focus:ring-2 focus:ring-interactive-500 focus:border-transparent',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            />
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
          {asset.promptUsed && (
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={showPrompt}
                onChange={(e) => setShowPrompt(e.target.checked)}
                disabled={isSubmitting}
                className="w-4 h-4 rounded border-border-subtle text-interactive-500 focus:ring-interactive-500 focus:ring-offset-0 disabled:opacity-50"
              />
              <span className="text-sm text-text-secondary">Show prompt publicly</span>
            </label>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className={cn(
                'flex-1 px-4 py-2.5 rounded-lg font-medium text-sm transition-colors',
                'border border-border-subtle text-text-secondary bg-transparent',
                'hover:bg-background-elevated focus:outline-none focus-visible:ring-2',
                'focus-visible:ring-interactive-500 focus-visible:ring-offset-2',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !title.trim()}
              className={cn(
                'flex-1 px-4 py-2.5 rounded-lg font-medium text-sm transition-colors',
                'bg-interactive-500 text-white',
                'hover:bg-interactive-600 focus:outline-none focus-visible:ring-2',
                'focus-visible:ring-interactive-500 focus-visible:ring-offset-2',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                'flex items-center justify-center gap-2'
              )}
            >
              {isSubmitting ? (
                <>
                  <Spinner />
                  <span>Sharing...</span>
                </>
              ) : (
                'Share'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ShareAssetModal;
