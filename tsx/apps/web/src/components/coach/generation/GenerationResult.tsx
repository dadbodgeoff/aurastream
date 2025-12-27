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
  className,
  testId = 'generation-result',
}: GenerationResultProps) {
  const prefersReducedMotion = useReducedMotion();
  const shouldAnimate = !prefersReducedMotion;
  
  const [isHovered, setIsHovered] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

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

      {/* Action buttons */}
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

      {/* Screen reader announcement */}
      <span className="sr-only">
        Asset generated successfully. {asset.assetType} with dimensions {asset.width}x{asset.height} pixels.
      </span>
    </div>
  );
});

GenerationResult.displayName = 'GenerationResult';

export default GenerationResult;
