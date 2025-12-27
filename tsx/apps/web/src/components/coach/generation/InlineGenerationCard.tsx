'use client';

/**
 * InlineGenerationCard Component
 * 
 * Combined progress/result card for inline generation in coach chat.
 * Manages state transitions between queued, processing, completed, and failed states.
 * 
 * @module coach/generation/InlineGenerationCard
 */

import React, { memo, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { CardBase } from '../cards/CardBase';
import { GenerationProgress } from './GenerationProgress';
import { GenerationResult } from './GenerationResult';
import { useInlineGeneration } from './useInlineGeneration';
import type { Asset } from './useInlineGeneration';

// ============================================================================
// Type Definitions
// ============================================================================

export interface InlineGenerationCardProps {
  /** Job ID to track */
  jobId: string;
  /** Session ID for the coach session */
  sessionId: string;
  /** Callback when generation completes */
  onComplete?: (asset: Asset) => void;
  /** Callback when generation fails */
  onError?: (error: string) => void;
  /** Callback when view fullscreen is clicked */
  onViewFullscreen?: (asset: Asset) => void;
  /** Callback when download is clicked */
  onDownload?: (asset: Asset) => void;
  /** Callback when share is clicked */
  onShare?: (asset: Asset) => void;
  /** Callback when regenerate is clicked */
  onRegenerate?: () => void;
  /** Additional CSS classes */
  className?: string;
  /** Test ID for testing */
  testId?: string;
}

// ============================================================================
// Icon Components
// ============================================================================

const SparklesIcon = ({ className }: { className?: string }) => (
  <svg className={className} width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
    />
  </svg>
);

const AlertIcon = ({ className }: { className?: string }) => (
  <svg className={className} width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
    />
  </svg>
);

const CheckCircleIcon = ({ className }: { className?: string }) => (
  <svg className={className} width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

// ============================================================================
// Sub-Components
// ============================================================================

interface ErrorStateProps {
  error: string;
  onRetry: () => void;
}

/**
 * Error state display with retry button
 */
const ErrorState = memo(function ErrorState({ error, onRetry }: ErrorStateProps) {
  return (
    <div className="space-y-4">
      {/* Error message */}
      <div className="flex items-start gap-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
        <AlertIcon className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-red-400">Generation Failed</p>
          <p className="text-sm text-text-secondary mt-1">{error}</p>
        </div>
      </div>

      {/* Retry button */}
      <button
        type="button"
        onClick={onRetry}
        className={cn(
          'w-full py-2.5 rounded-lg',
          'text-sm font-medium',
          'bg-white/10 hover:bg-white/20',
          'text-text-primary',
          'transition-colors',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500'
        )}
      >
        Try Again
      </button>
    </div>
  );
});

ErrorState.displayName = 'ErrorState';

// ============================================================================
// Main Component
// ============================================================================

/**
 * InlineGenerationCard displays generation progress and results inline in chat.
 * 
 * States:
 * - **queued**: "Starting generation..." with skeleton
 * - **processing**: Progress bar + "Creating your asset..."
 * - **completed**: Image preview + actions
 * - **failed**: Error message + retry button
 * 
 * @example
 * ```tsx
 * <InlineGenerationCard
 *   jobId="job-123"
 *   sessionId="session-456"
 *   onComplete={(asset) => console.log('Generated:', asset)}
 *   onViewFullscreen={(asset) => openLightbox(asset)}
 *   onDownload={(asset) => downloadAsset(asset)}
 *   onShare={(asset) => shareAsset(asset)}
 *   onRegenerate={() => startNewGeneration()}
 * />
 * ```
 */
export const InlineGenerationCard = memo(function InlineGenerationCard({
  jobId,
  sessionId,
  onComplete,
  onError,
  onViewFullscreen,
  onDownload,
  onShare,
  onRegenerate,
  className,
  testId = 'inline-generation-card',
}: InlineGenerationCardProps) {
  const {
    status,
    progress,
    asset,
    error,
    reset,
  } = useInlineGeneration({
    sessionId,
    onComplete,
    onError,
  });

  // Handle retry
  const handleRetry = useCallback(() => {
    reset();
    onRegenerate?.();
  }, [reset, onRegenerate]);

  // Handle download
  const handleDownload = useCallback(() => {
    if (asset) {
      onDownload?.(asset);
    }
  }, [asset, onDownload]);

  // Handle share
  const handleShare = useCallback(() => {
    if (asset) {
      onShare?.(asset);
    }
  }, [asset, onShare]);

  // Handle view fullscreen
  const handleViewFullscreen = useCallback(() => {
    if (asset) {
      onViewFullscreen?.(asset);
    }
  }, [asset, onViewFullscreen]);

  // Handle regenerate
  const handleRegenerate = useCallback(() => {
    reset();
    onRegenerate?.();
  }, [reset, onRegenerate]);

  // Determine card title and icon based on status
  const getCardConfig = () => {
    switch (status) {
      case 'queued':
      case 'processing':
        return {
          title: 'Generating Asset',
          icon: <SparklesIcon className="w-5 h-5 animate-pulse" />,
        };
      case 'completed':
        return {
          title: 'Asset Ready',
          icon: <CheckCircleIcon className="w-5 h-5 text-green-400" />,
        };
      case 'failed':
        return {
          title: 'Generation Failed',
          icon: <AlertIcon className="w-5 h-5 text-red-400" />,
        };
      default:
        return {
          title: 'Generation',
          icon: <SparklesIcon className="w-5 h-5" />,
        };
    }
  };

  const { title, icon } = getCardConfig();

  // Render content based on status
  const renderContent = () => {
    switch (status) {
      case 'queued':
        return (
          <GenerationProgress
            status="queued"
            progress={progress}
            statusMessage="Starting generation..."
          />
        );

      case 'processing':
        return (
          <GenerationProgress
            status="processing"
            progress={progress}
            statusMessage="Creating your asset..."
          />
        );

      case 'completed':
        if (asset) {
          return (
            <GenerationResult
              asset={asset}
              onDownload={handleDownload}
              onShare={handleShare}
              onRegenerate={handleRegenerate}
              onViewFullscreen={handleViewFullscreen}
            />
          );
        }
        return null;

      case 'failed':
        return (
          <ErrorState
            error={error || 'An unknown error occurred'}
            onRetry={handleRetry}
          />
        );

      default:
        return null;
    }
  };

  return (
    <CardBase
      title={title}
      icon={icon}
      className={className}
      testId={testId}
    >
      {renderContent()}
    </CardBase>
  );
});

InlineGenerationCard.displayName = 'InlineGenerationCard';

export default InlineGenerationCard;
