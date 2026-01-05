/**
 * Instant Preview Component
 * 
 * Small preview in corner showing exact export output.
 * Updates in real-time, click to expand full-screen preview.
 */

'use client';

import { useState, useCallback, useEffect } from 'react';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

interface InstantPreviewProps {
  /** Preview image URL (data URL or blob URL) */
  previewUrl: string | null;
  /** Canvas dimensions */
  dimensions: { width: number; height: number };
  /** Platform context for mockup display */
  platform?: 'youtube' | 'twitch' | 'instagram' | 'tiktok' | 'discord';
  /** Whether preview is visible */
  visible?: boolean;
  /** Toggle visibility */
  onToggle?: () => void;
  /** Position of the preview */
  position?: 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right';
  className?: string;
}

// ============================================================================
// Icons
// ============================================================================

function ExpandIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="15 3 21 3 21 9" />
      <polyline points="9 21 3 21 3 15" />
      <line x1="21" y1="3" x2="14" y2="10" />
      <line x1="3" y1="21" x2="10" y2="14" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

// ============================================================================
// Platform Mockups
// ============================================================================

interface MockupProps {
  previewUrl: string;
  platform: string;
}

function YouTubeMockup({ previewUrl }: MockupProps) {
  return (
    <div className="bg-white rounded-lg overflow-hidden shadow-lg">
      {/* Video thumbnail */}
      <div className="relative aspect-video bg-gray-900">
        <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
        {/* Duration badge */}
        <div className="absolute bottom-1 right-1 px-1 py-0.5 bg-black/80 text-white text-[8px] rounded">
          12:34
        </div>
      </div>
      {/* Video info */}
      <div className="p-2 flex gap-2">
        <div className="w-6 h-6 rounded-full bg-gray-300 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="h-2 bg-gray-200 rounded w-full mb-1" />
          <div className="h-2 bg-gray-100 rounded w-3/4" />
        </div>
      </div>
    </div>
  );
}

function TwitchMockup({ previewUrl }: MockupProps) {
  return (
    <div className="bg-[#18181b] rounded-lg overflow-hidden shadow-lg">
      {/* Stream preview */}
      <div className="relative aspect-video">
        <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
        {/* Live badge */}
        <div className="absolute top-1 left-1 px-1.5 py-0.5 bg-red-600 text-white text-[8px] font-bold rounded">
          LIVE
        </div>
        {/* Viewer count */}
        <div className="absolute bottom-1 left-1 px-1 py-0.5 bg-black/60 text-white text-[8px] rounded flex items-center gap-1">
          <span className="w-1.5 h-1.5 bg-red-500 rounded-full" />
          1.2K
        </div>
      </div>
      {/* Channel info */}
      <div className="p-2 flex gap-2">
        <div className="w-6 h-6 rounded-full bg-purple-600 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="h-2 bg-gray-700 rounded w-full mb-1" />
          <div className="h-2 bg-gray-800 rounded w-2/3" />
        </div>
      </div>
    </div>
  );
}

function InstagramMockup({ previewUrl }: MockupProps) {
  return (
    <div className="bg-white rounded-xl overflow-hidden shadow-lg max-w-[120px]">
      {/* Story preview */}
      <div className="relative aspect-[9/16]">
        <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
        {/* Top gradient */}
        <div className="absolute inset-x-0 top-0 h-8 bg-gradient-to-b from-black/40 to-transparent" />
        {/* Profile */}
        <div className="absolute top-1 left-1 flex items-center gap-1">
          <div className="w-4 h-4 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 p-0.5">
            <div className="w-full h-full rounded-full bg-white" />
          </div>
          <span className="text-[6px] text-white font-medium">username</span>
        </div>
      </div>
    </div>
  );
}

function DefaultMockup({ previewUrl }: MockupProps) {
  return (
    <div className="rounded-lg overflow-hidden shadow-lg border border-border-subtle">
      <img src={previewUrl} alt="Preview" className="w-full h-full object-contain" />
    </div>
  );
}

// ============================================================================
// Full Screen Preview Modal
// ============================================================================

interface FullScreenPreviewProps {
  previewUrl: string;
  dimensions: { width: number; height: number };
  platform?: string;
  onClose: () => void;
}

function FullScreenPreview({ previewUrl, dimensions, platform, onClose }: FullScreenPreviewProps) {
  // Close on escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);
  
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-8 bg-black/90 backdrop-blur-sm">
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors"
      >
        <XIcon />
      </button>
      
      {/* Preview */}
      <div className="max-w-full max-h-full">
        {platform ? (
          <div className="transform scale-150 origin-center">
            {platform === 'youtube' && <YouTubeMockup previewUrl={previewUrl} platform={platform} />}
            {platform === 'twitch' && <TwitchMockup previewUrl={previewUrl} platform={platform} />}
            {platform === 'instagram' && <InstagramMockup previewUrl={previewUrl} platform={platform} />}
            {!['youtube', 'twitch', 'instagram'].includes(platform) && (
              <DefaultMockup previewUrl={previewUrl} platform={platform} />
            )}
          </div>
        ) : (
          <img
            src={previewUrl}
            alt="Full preview"
            className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl"
          />
        )}
      </div>
      
      {/* Dimensions info */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full bg-white/10 text-white text-sm">
        {dimensions.width} × {dimensions.height}
      </div>
    </div>
  );
}

// ============================================================================
// Instant Preview
// ============================================================================

export function InstantPreview({
  previewUrl,
  dimensions,
  platform,
  visible = true,
  onToggle,
  position = 'bottom-right',
  className,
}: InstantPreviewProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showMockup, setShowMockup] = useState(true);
  
  const handleExpand = useCallback(() => {
    setIsExpanded(true);
  }, []);
  
  const handleClose = useCallback(() => {
    setIsExpanded(false);
  }, []);
  
  const positionClasses = {
    'bottom-left': 'bottom-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'top-left': 'top-4 left-4',
    'top-right': 'top-4 right-4',
  };
  
  if (!visible) {
    return (
      <button
        onClick={onToggle}
        className={cn(
          'absolute p-2 rounded-lg bg-background-surface/90 backdrop-blur-sm',
          'border border-border-subtle shadow-lg',
          'text-text-muted hover:text-text-primary transition-colors',
          positionClasses[position],
          className
        )}
        title="Show preview"
      >
        <EyeOffIcon />
      </button>
    );
  }
  
  return (
    <>
      <div
        className={cn(
          'absolute rounded-xl overflow-hidden',
          'bg-background-surface/90 backdrop-blur-sm',
          'border border-border-subtle shadow-lg',
          'transition-all duration-200',
          positionClasses[position],
          className
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-2 py-1.5 border-b border-border-subtle bg-background-elevated/50">
          <span className="text-xs font-medium text-text-secondary">Preview</span>
          <div className="flex items-center gap-1">
            {platform && (
              <button
                onClick={() => setShowMockup(!showMockup)}
                className={cn(
                  'p-1 rounded text-text-muted hover:text-text-primary transition-colors',
                  showMockup && 'text-interactive-400'
                )}
                title={showMockup ? 'Show raw preview' : 'Show platform mockup'}
              >
                <EyeIcon />
              </button>
            )}
            <button
              onClick={handleExpand}
              className="p-1 rounded text-text-muted hover:text-text-primary transition-colors"
              title="Expand preview"
            >
              <ExpandIcon />
            </button>
            {onToggle && (
              <button
                onClick={onToggle}
                className="p-1 rounded text-text-muted hover:text-text-primary transition-colors"
                title="Hide preview"
              >
                <XIcon />
              </button>
            )}
          </div>
        </div>
        
        {/* Preview content */}
        <div className="p-2 w-[160px]">
          {previewUrl ? (
            showMockup && platform ? (
              <div className="transform scale-[0.4] origin-top-left w-[400px]">
                {platform === 'youtube' && <YouTubeMockup previewUrl={previewUrl} platform={platform} />}
                {platform === 'twitch' && <TwitchMockup previewUrl={previewUrl} platform={platform} />}
                {platform === 'instagram' && <InstagramMockup previewUrl={previewUrl} platform={platform} />}
                {!['youtube', 'twitch', 'instagram'].includes(platform) && (
                  <DefaultMockup previewUrl={previewUrl} platform={platform} />
                )}
              </div>
            ) : (
              <div
                className="relative rounded-lg overflow-hidden bg-background-base cursor-pointer hover:ring-2 hover:ring-interactive-500/50 transition-all"
                onClick={handleExpand}
              >
                <img
                  src={previewUrl}
                  alt="Canvas preview"
                  className="w-full h-auto object-contain"
                />
              </div>
            )
          ) : (
            <div className="aspect-video bg-background-base rounded-lg flex items-center justify-center">
              <span className="text-xs text-text-muted">No preview</span>
            </div>
          )}
          
          {/* Dimensions */}
          <p className="text-[10px] text-text-tertiary text-center mt-1">
            {dimensions.width} × {dimensions.height}
          </p>
        </div>
      </div>
      
      {/* Full screen modal */}
      {isExpanded && previewUrl && (
        <FullScreenPreview
          previewUrl={previewUrl}
          dimensions={dimensions}
          platform={platform}
          onClose={handleClose}
        />
      )}
    </>
  );
}
