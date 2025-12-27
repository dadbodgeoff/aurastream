'use client';

/**
 * SessionBadge Component
 * 
 * Displays the current asset type as a pill-shaped badge with an icon.
 * Used in the session context bar to show what type of asset is being created.
 * 
 * @module coach/context/SessionBadge
 */

import React, { memo } from 'react';
import { cn } from '@/lib/utils';

// ============================================================================
// Type Definitions
// ============================================================================

export interface SessionBadgeProps {
  /** Asset type identifier (e.g., 'twitch_emote', 'youtube_thumbnail') */
  assetType: string;
  /** Additional CSS classes */
  className?: string;
  /** Test ID for testing */
  testId?: string;
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Human-readable labels for asset types
 */
export const ASSET_TYPE_LABELS: Record<string, string> = {
  twitch_emote: 'Twitch Emote',
  youtube_thumbnail: 'YouTube Thumbnail',
  twitch_banner: 'Twitch Banner',
  twitch_badge: 'Twitch Badge',
  twitch_panel: 'Twitch Panel',
  twitch_offline: 'Twitch Offline Screen',
  overlay: 'Stream Overlay',
  thumbnail: 'Thumbnail',
  banner: 'Banner',
  story_graphic: 'Story Graphic',
  tiktok_story: 'TikTok Story',
  instagram_story: 'Instagram Story',
  instagram_reel: 'Instagram Reel',
};

// ============================================================================
// Icon Components
// ============================================================================

const EmoteIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <circle cx="12" cy="12" r="10" />
    <path d="M8 14s1.5 2 4 2 4-2 4-2" />
    <line x1="9" y1="9" x2="9.01" y2="9" />
    <line x1="15" y1="9" x2="15.01" y2="9" />
  </svg>
);

const ThumbnailIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <polyline points="21 15 16 10 5 21" />
  </svg>
);

const BannerIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <rect x="2" y="7" width="20" height="10" rx="2" ry="2" />
    <line x1="6" y1="12" x2="18" y2="12" />
  </svg>
);

const BadgeIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
  </svg>
);

const OverlayIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
    <line x1="8" y1="21" x2="16" y2="21" />
    <line x1="12" y1="17" x2="12" y2="21" />
  </svg>
);

const StoryIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <rect x="6" y="2" width="12" height="20" rx="2" ry="2" />
    <line x1="12" y1="18" x2="12.01" y2="18" />
  </svg>
);

const DefaultIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
    <line x1="3" y1="9" x2="21" y2="9" />
    <line x1="9" y1="21" x2="9" y2="9" />
  </svg>
);

/**
 * Get the appropriate icon for an asset type
 */
function getAssetIcon(assetType: string): React.FC<{ className?: string }> {
  if (assetType.includes('emote')) return EmoteIcon;
  if (assetType.includes('thumbnail')) return ThumbnailIcon;
  if (assetType.includes('banner')) return BannerIcon;
  if (assetType.includes('badge')) return BadgeIcon;
  if (assetType.includes('overlay')) return OverlayIcon;
  if (assetType.includes('story') || assetType.includes('reel')) return StoryIcon;
  return DefaultIcon;
}

/**
 * Get the human-readable label for an asset type
 */
export function getAssetTypeLabel(assetType: string): string {
  return ASSET_TYPE_LABELS[assetType] || assetType.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * SessionBadge displays the current asset type as a pill-shaped badge.
 * 
 * Features:
 * - Asset type icon
 * - Human-readable label
 * - Pill-shaped styling with accent colors
 * 
 * @example
 * ```tsx
 * <SessionBadge assetType="twitch_emote" />
 * ```
 */
export const SessionBadge = memo(function SessionBadge({
  assetType,
  className,
  testId = 'session-badge',
}: SessionBadgeProps) {
  const Icon = getAssetIcon(assetType);
  const label = getAssetTypeLabel(assetType);

  return (
    <span
      data-testid={testId}
      className={cn(
        // Pill shape
        'inline-flex items-center gap-1.5',
        'rounded-full px-2.5 py-0.5',
        // Colors
        'bg-accent-500/20 text-accent-400',
        // Typography
        'text-sm font-medium',
        className
      )}
    >
      <span aria-hidden="true">
        <Icon className="w-3.5 h-3.5" />
      </span>
      <span>{label}</span>
    </span>
  );
});

SessionBadge.displayName = 'SessionBadge';

export default SessionBadge;
