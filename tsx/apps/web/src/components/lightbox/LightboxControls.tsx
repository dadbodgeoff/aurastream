'use client';

import React, { useCallback, useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { isIOS, isSafari } from '@/utils/download';

export interface LightboxControlsProps {
  /** Callback when download is clicked */
  onDownload: () => void;
  /** Callback when share is clicked */
  onShare: () => void;
  /** Callback when copy link is clicked */
  onCopyLink: () => void;
  /** Optional callback when regenerate is clicked */
  onRegenerate?: () => void;
  /** Asset type for context (e.g., 'twitch_emote') */
  assetType?: string;
  /** Additional CSS classes */
  className?: string;
  /** Test ID for testing */
  testId?: string;
}

/**
 * LightboxControls - Action buttons for the lightbox
 *
 * Features:
 * - Download, Share, Copy Link buttons
 * - Optional Regenerate button
 * - Glass effect background
 * - Rounded pill design
 * - Positioned at bottom of lightbox
 *
 * @example
 * ```tsx
 * <LightboxControls
 *   onDownload={() => downloadAsset(asset.id)}
 *   onShare={() => shareAsset(asset.id)}
 *   onCopyLink={() => copyAssetLink(asset.id)}
 *   onRegenerate={() => regenerateAsset(asset.id)}
 *   assetType="twitch_emote"
 * />
 * ```
 */
export function LightboxControls({
  onDownload,
  onShare,
  onCopyLink,
  onRegenerate,
  assetType,
  className,
  testId = 'lightbox-controls',
}: LightboxControlsProps) {
  const [copiedFeedback, setCopiedFeedback] = useState(false);
  const [isAppleDevice, setIsAppleDevice] = useState(false);

  // Detect Apple device on mount (client-side only)
  useEffect(() => {
    setIsAppleDevice(isIOS() || isSafari());
  }, []);

  /**
   * Handle copy link with visual feedback
   */
  const handleCopyLink = useCallback(() => {
    onCopyLink();
    setCopiedFeedback(true);
    setTimeout(() => setCopiedFeedback(false), 2000);
  }, [onCopyLink]);

  return (
    <div
      data-testid={testId}
      className={cn(
        // Glass effect background
        'flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-2',
        'bg-background-elevated/80 backdrop-blur-md',
        'border border-border-subtle rounded-full',
        'shadow-lg',
        className
      )}
    >
      {/* Save/Download Button - shows "Save" on Apple devices for clarity */}
      <ControlButton
        onClick={onDownload}
        icon={isAppleDevice ? <SaveIcon /> : <DownloadIcon />}
        label={isAppleDevice ? 'Save' : 'Download'}
        tooltip={isAppleDevice ? 'Save to Photos' : 'Download image'}
      />

      {/* Share Button */}
      <ControlButton
        onClick={onShare}
        icon={<ShareIcon />}
        label="Share"
        tooltip="Share image"
      />

      {/* Copy Link Button */}
      <ControlButton
        onClick={handleCopyLink}
        icon={copiedFeedback ? <CheckIcon /> : <LinkIcon />}
        label={copiedFeedback ? 'Copied!' : 'Copy Link'}
        tooltip="Copy link to clipboard"
        variant={copiedFeedback ? 'success' : 'default'}
      />

      {/* Regenerate Button (optional) */}
      {onRegenerate && (
        <>
          <Divider />
          <ControlButton
            onClick={onRegenerate}
            icon={<RegenerateIcon />}
            label="Regenerate"
            tooltip={`Regenerate ${assetType ? assetType.replace('_', ' ') : 'asset'}`}
            variant="primary"
          />
        </>
      )}
    </div>
  );
}

// =============================================================================
// Sub-components
// =============================================================================

interface ControlButtonProps {
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  tooltip: string;
  variant?: 'default' | 'primary' | 'success';
}

function ControlButton({
  onClick,
  icon,
  label,
  tooltip,
  variant = 'default',
}: ControlButtonProps) {
  return (
    <button
      onClick={onClick}
      title={tooltip}
      className={cn(
        // Base styles
        'flex items-center gap-1.5 px-3 py-2 rounded-full',
        'text-sm font-medium',
        'transition-all duration-150',
        'focus:outline-none focus:ring-2 focus:ring-interactive-600 focus:ring-offset-2 focus:ring-offset-background-elevated',
        // Touch target
        'min-h-[44px] min-w-[44px] sm:min-w-0',
        // Variant styles
        variant === 'default' && [
          'text-text-secondary hover:text-text-primary',
          'hover:bg-background-surface active:bg-background-surface',
        ],
        variant === 'primary' && [
          'text-interactive-600 hover:text-interactive-700',
          'hover:bg-interactive-100 active:bg-interactive-200',
        ],
        variant === 'success' && [
          'text-success-600',
          'bg-success-100/50',
        ]
      )}
    >
      <span className="w-5 h-5">{icon}</span>
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

function Divider() {
  return (
    <div className="w-px h-6 bg-border-subtle mx-1" aria-hidden="true" />
  );
}

// =============================================================================
// Icons
// =============================================================================

function DownloadIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

function SaveIcon() {
  // Photo/gallery icon for iOS "Save to Photos" action
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </svg>
  );
}

function LinkIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function RegenerateIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
      <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
      <path d="M16 16h5v5" />
    </svg>
  );
}
