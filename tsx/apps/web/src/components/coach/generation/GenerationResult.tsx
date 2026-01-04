'use client';

/**
 * GenerationResult Component
 * 
 * Displays completed asset with hover overlay and action buttons.
 * 
 * @module coach/generation/GenerationResult
 */

import React, { memo, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { useReducedMotion } from '@aurastream/shared';
import type { Asset } from './useInlineGeneration';

// ============================================================================
// Type Definitions
// ============================================================================

export interface GenerationResultProps {
  /** The generated asset to display */
  asset: Asset;
  /** Callback when download button is clicked */
  onDownload: () => void;
  /** Callback when share button is clicked */
  onShare: () => void;
  /** Callback when regenerate button is clicked */
  onRegenerate: () => void;
  /** Callback when view fullscreen is clicked */
  onViewFullscreen: () => void;
  /** Callback when user wants to tweak the result with feedback */
  onTweak?: (feedback: string) => void;
  /** Whether tweaking is in progress */
  isTweaking?: boolean;
  /** User's subscription tier (free users can't tweak) */
  tier?: 'free' | 'pro' | 'studio' | 'unlimited';
  /** Additional CSS classes */
  className?: string;
  /** Test ID for testing */
  testId?: string;
}

// ============================================================================
// Icon Components
// ============================================================================

const DownloadIcon = ({ className }: { className?: string }) => (
  <svg className={className} width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
  </svg>
);

const ShareIcon = ({ className }: { className?: string }) => (
  <svg className={className} width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
  </svg>
);

const RefreshIcon = ({ className }: { className?: string }) => (
  <svg className={className} width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
);

const ExpandIcon = ({ className }: { className?: string }) => (
  <svg className={className} width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
  </svg>
);

const HeartIcon = ({ className }: { className?: string }) => (
  <svg className={className} width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
  </svg>
);

const SparklesIcon = ({ className }: { className?: string }) => (
  <svg className={className} width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
  </svg>
);

const ArrowLeftIcon = ({ className }: { className?: string }) => (
  <svg className={className} width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
  </svg>
);

const LoadingSpinner = ({ className }: { className?: string }) => (
  <svg className={cn('animate-spin', className)} fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
  </svg>
);

// ============================================================================
// Sub-Components
// ============================================================================

interface ActionButtonProps {
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  className?: string;
}

/**
 * Action button with icon and label
 */
const ActionButton = memo(function ActionButton({
  onClick,
  icon,
  label,
  className,
}: ActionButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 px-3 py-2 rounded-lg',
        'text-xs font-medium',
        'bg-white/10 hover:bg-white/20',
        'text-text-secondary hover:text-text-primary',
        'transition-colors',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500',
        className
      )}
      aria-label={label}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
});

ActionButton.displayName = 'ActionButton';

// ============================================================================
// Main Component
// ============================================================================

/**
 * GenerationResult displays a completed asset with actions.
 * 
 * Features:
 * - Image display with aspect ratio preservation
 * - Hover overlay with "View Full" button
 * - Action buttons: Download, Share, Regenerate
 * - Click on image opens lightbox
 * - Keyboard accessible
 * - Reduced motion support
 * 
 * @example
 * ```tsx
 * <GenerationResult
 *   asset={{
 *     id: 'asset-123',
 *     url: 'https://cdn.example.com/asset.png',
 *     assetType: 'thumbnail',
 *     width: 1280,
 *     height: 720,
 *   }}
 *   onDownload={() => downloadAsset()}
 *   onShare={() => shareAsset()}
 *   onRegenerate={() => regenerate()}
 *   onViewFullscreen={() => openLightbox()}
 * />
 * ```
 */
export const GenerationResult = memo(function GenerationResult({
  asset,
  onDownload,
  onShare,
  onRegenerate,
  onViewFullscreen,
  onTweak,
  isTweaking = false,
  tier = 'free',
  className,
  testId = 'generation-result',
}: GenerationResultProps) {
  const prefersReducedMotion = useReducedMotion();
  const shouldAnimate = !prefersReducedMotion;
  
  const [isHovered, setIsHovered] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  
  // Refinement flow state
  const [refinementStep, setRefinementStep] = useState<'choice' | 'input' | 'satisfied'>('choice');
  const [tweakInput, setTweakInput] = useState('');

  const canTweak = tier !== 'free' && onTweak;

  const handleImageLoad = useCallback(() => {
    setImageLoaded(true);
  }, []);

  const handleImageError = useCallback(() => {
    setImageError(true);
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onViewFullscreen();
    }
  }, [onViewFullscreen]);

  const handleLoveIt = useCallback(() => {
    setRefinementStep('satisfied');
  }, []);

  const handleTweakClick = useCallback(() => {
    setRefinementStep('input');
  }, []);

  const handleBackToChoice = useCallback(() => {
    setRefinementStep('choice');
    setTweakInput('');
  }, []);

  const handleTweakSubmit = useCallback(() => {
    if (tweakInput.trim().length >= 3 && onTweak) {
      onTweak(tweakInput.trim());
    }
  }, [tweakInput, onTweak]);

  const handleTweakKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleTweakSubmit();
    }
    if (e.key === 'Escape') {
      handleBackToChoice();
    }
  }, [handleTweakSubmit, handleBackToChoice]);

  // Determine aspect ratio based on asset dimensions
  const aspectRatio = asset.width && asset.height 
    ? asset.width / asset.height 
    : 16 / 9;
  
  const isSquare = Math.abs(aspectRatio - 1) < 0.1;
  const aspectClass = isSquare ? 'aspect-square' : 'aspect-video';

  return (
    <div
      data-testid={testId}
      className={cn('space-y-3', className)}
    >
      {/* Image container */}
      <div
        className={cn(
          'relative rounded-lg overflow-hidden',
          'bg-white/5',
          aspectClass,
          'cursor-pointer',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background-surface'
        )}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={onViewFullscreen}
        onKeyDown={handleKeyDown}
        role="button"
        tabIndex={0}
        aria-label={`View ${asset.assetType} fullscreen`}
      >
        {/* Image */}
        {!imageError ? (
          <img
            src={asset.url}
            alt={`Generated ${asset.assetType}`}
            className={cn(
              'w-full h-full object-cover',
              shouldAnimate && 'transition-transform duration-300',
              isHovered && shouldAnimate && 'scale-105'
            )}
            onLoad={handleImageLoad}
            onError={handleImageError}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-center text-text-tertiary">
              <svg
                className="w-12 h-12 mx-auto mb-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <p className="text-sm">Failed to load image</p>
            </div>
          </div>
        )}

        {/* Loading skeleton */}
        {!imageLoaded && !imageError && (
          <div
            className="absolute inset-0 bg-white/5 animate-shimmer"
            aria-hidden="true"
          />
        )}

        {/* Hover overlay */}
        <div
          className={cn(
            'absolute inset-0',
            'bg-black/50 backdrop-blur-sm',
            'flex items-center justify-center',
            shouldAnimate && 'transition-opacity duration-200',
            isHovered ? 'opacity-100' : 'opacity-0',
            'pointer-events-none'
          )}
          aria-hidden="true"
        >
          <div
            className={cn(
              'inline-flex items-center gap-2 px-4 py-2 rounded-lg',
              'bg-white/20 backdrop-blur-sm',
              'text-sm font-medium text-white'
            )}
          >
            <ExpandIcon className="w-5 h-5" />
            <span>View Full</span>
          </div>
        </div>
      </div>

      {/* Refinement Flow - "Happy with this?" */}
      {refinementStep === 'choice' && (
        <div className="p-4 rounded-xl bg-background-elevated border border-border-subtle space-y-3">
          <h4 className="text-sm font-semibold text-text-primary text-center">
            Happy with this? 🎨
          </h4>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleLoveIt}
              className={cn(
                'flex-1 flex items-center justify-center gap-2',
                'px-4 py-3 rounded-lg',
                'bg-emerald-600 hover:bg-emerald-500',
                'text-white font-medium text-sm',
                'transition-colors',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50'
              )}
            >
              <HeartIcon className="w-4 h-4" />
              I Love It!
            </button>
            <button
              type="button"
              onClick={handleTweakClick}
              disabled={!canTweak}
              className={cn(
                'flex-1 flex items-center justify-center gap-2',
                'px-4 py-3 rounded-lg',
                'bg-interactive-600 hover:bg-interactive-500',
                'text-white font-medium text-sm',
                'transition-colors',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-interactive-500/50',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              <SparklesIcon className="w-4 h-4" />
              Almost... tweak it
            </button>
          </div>
          {!canTweak && (
            <p className="text-xs text-center text-amber-400">
              ✨ Upgrade to Pro to tweak your creations
            </p>
          )}
          <p className="text-xs text-center text-text-tertiary">
            💡 Way off? Click "Regenerate" below to start fresh
          </p>
        </div>
      )}

      {/* Tweak Input */}
      {refinementStep === 'input' && (
        <div className="space-y-3">
          <button
            type="button"
            onClick={handleBackToChoice}
            disabled={isTweaking}
            className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors disabled:opacity-50"
          >
            <ArrowLeftIcon className="w-4 h-4" />
            Back
          </button>
          <h4 className="text-sm font-semibold text-text-primary">
            What would you like to change? ✨
          </h4>
          <div className="flex flex-wrap gap-2">
            {['Make it brighter', 'More contrast', 'Change colors', 'Add glow effect', 'Make it darker'].map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => setTweakInput(suggestion)}
                disabled={isTweaking}
                className={cn(
                  'px-3 py-1.5 rounded-full',
                  'text-xs font-medium',
                  'bg-white/5 hover:bg-white/10',
                  'text-text-secondary hover:text-text-primary',
                  'border border-border-subtle',
                  'transition-colors',
                  'disabled:opacity-50'
                )}
              >
                {suggestion}
              </button>
            ))}
          </div>
          <textarea
            value={tweakInput}
            onChange={(e) => setTweakInput(e.target.value)}
            onKeyDown={handleTweakKeyDown}
            placeholder="e.g., Make the background darker and add more glow"
            disabled={isTweaking}
            rows={2}
            maxLength={300}
            className={cn(
              'w-full px-3 py-2 rounded-lg resize-none',
              'bg-background-surface border border-border-subtle',
              'text-text-primary placeholder-text-tertiary text-sm',
              'focus:outline-none focus:ring-2 focus:ring-interactive-600/50 focus:border-interactive-600',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-text-tertiary">
              Press Enter to submit • Escape to go back
            </span>
            <span className="text-xs text-text-tertiary">
              {tweakInput.length}/300
            </span>
          </div>
          <button
            type="button"
            onClick={handleTweakSubmit}
            disabled={tweakInput.trim().length < 3 || isTweaking}
            className={cn(
              'w-full flex items-center justify-center gap-2',
              'px-4 py-3 rounded-lg',
              'bg-interactive-600 hover:bg-interactive-500',
              'text-white font-medium text-sm',
              'transition-colors',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-interactive-500/50',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            {isTweaking ? (
              <>
                <LoadingSpinner className="w-4 h-4" />
                Tweaking...
              </>
            ) : (
              <>
                <SparklesIcon className="w-4 h-4" />
                Tweak It
              </>
            )}
          </button>
        </div>
      )}

      {/* Action buttons - Show when satisfied */}
      {refinementStep === 'satisfied' && (
        <div className="flex items-center gap-2 flex-wrap">
          <ActionButton
            onClick={onDownload}
            icon={<DownloadIcon className="w-4 h-4" />}
            label="Download"
          />
          <ActionButton
            onClick={onShare}
            icon={<ShareIcon className="w-4 h-4" />}
            label="Share"
          />
          <ActionButton
            onClick={onRegenerate}
            icon={<RefreshIcon className="w-4 h-4" />}
            label="Regenerate"
          />
        </div>
      )}

      {/* Screen reader announcement */}
      <span className="sr-only">
        Asset generated successfully. {asset.assetType} with dimensions {asset.width}x{asset.height} pixels.
      </span>
    </div>
  );
});

GenerationResult.displayName = 'GenerationResult';

export default GenerationResult;
