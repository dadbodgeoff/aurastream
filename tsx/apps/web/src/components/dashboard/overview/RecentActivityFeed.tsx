'use client';

/**
 * RecentActivityFeed Component
 * 
 * Dashboard 2.0 - Task 1.3
 * Aggregated activity feed from assets, brand kits, and jobs.
 * Shows recent user activity with thumbnails and timestamps.
 * 
 * @module dashboard/overview/RecentActivityFeed
 */

import { memo, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { useAssets } from '@aurastream/api-client';
import { useBrandKits } from '@aurastream/api-client';
import { useJobs } from '@aurastream/api-client';
import { 
  CreateIcon, 
  BrandIcon, 
  CheckIcon, 
  ClockIcon,
  ArrowRightIcon,
  LibraryIcon,
} from '../icons';

// =============================================================================
// Types
// =============================================================================

export type RecentActivityType = 
  | 'asset_created' 
  | 'brand_kit_updated' 
  | 'generation_completed';

export interface RecentActivityItem {
  id: string;
  type: RecentActivityType;
  title: string;
  description?: string;
  timestamp: string;
  imageUrl?: string;
  href?: string;
}

export interface RecentActivityFeedProps {
  /** Maximum number of items to display */
  maxItems?: number;
  /** Additional CSS classes */
  className?: string;
  /** Custom title */
  title?: string;
  /** Show "View all" link */
  showViewAll?: boolean;
}

// =============================================================================
// Constants
// =============================================================================

const ACTIVITY_ICONS: Record<RecentActivityType, React.ReactNode> = {
  asset_created: <CreateIcon size="sm" />,
  brand_kit_updated: <BrandIcon size="sm" />,
  generation_completed: <CheckIcon size="sm" />,
};

const ACTIVITY_COLORS: Record<RecentActivityType, string> = {
  asset_created: 'bg-interactive-500/10 text-interactive-400',
  brand_kit_updated: 'bg-accent-500/10 text-accent-400',
  generation_completed: 'bg-emerald-500/10 text-emerald-400',
};

// =============================================================================
// Helper Functions
// =============================================================================

function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  if (isNaN(date.getTime())) return 'Recently';
  
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

function getAssetTypeLabel(assetType: string): string {
  const labels: Record<string, string> = {
    thumbnail: 'Thumbnail',
    overlay: 'Overlay',
    banner: 'Banner',
    story_graphic: 'Story',
    clip_cover: 'Clip Cover',
    twitch_emote: 'Emote',
    twitch_badge: 'Badge',
    twitch_panel: 'Panel',
    twitch_offline: 'Offline Screen',
  };
  return labels[assetType] || 'Asset';
}

// =============================================================================
// ActivityItemRow Component
// =============================================================================

interface ActivityItemRowProps {
  item: RecentActivityItem;
}

const ActivityItemRow = memo(function ActivityItemRow({ item }: ActivityItemRowProps) {
  const { type, title, description, timestamp, imageUrl, href } = item;
  
  const content = (
    <div className={cn(
      'flex items-center gap-4 px-4 py-3 w-full text-left',
      'transition-colors duration-150 motion-reduce:transition-none',
      href && 'hover:bg-background-elevated cursor-pointer'
    )}>
      {/* Thumbnail or Icon */}
      {imageUrl ? (
        <div className="w-10 h-10 rounded-lg overflow-hidden bg-background-elevated flex-shrink-0 relative">
          <Image
            src={imageUrl}
            alt={`Thumbnail for ${title}`}
            fill
            sizes="40px"
            className="object-cover"
            loading="lazy"
          />
        </div>
      ) : (
        <div 
          className={cn(
            'w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0',
            ACTIVITY_COLORS[type]
          )}
          aria-hidden="true"
        >
          {ACTIVITY_ICONS[type]}
        </div>
      )}
      
      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-text-primary truncate">
          {title}
        </p>
        {description && (
          <p className="text-xs text-text-muted truncate mt-0.5">
            {description}
          </p>
        )}
      </div>
      
      {/* Timestamp */}
      <time 
        className="text-xs text-text-muted flex-shrink-0"
        dateTime={timestamp}
        aria-label={`${formatTimestamp(timestamp)}`}
      >
        {formatTimestamp(timestamp)}
      </time>
    </div>
  );
  
  if (href) {
    return (
      <Link 
        href={href} 
        className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-interactive-500 focus-visible:ring-inset rounded-lg"
        aria-label={`${title}${description ? `, ${description}` : ''}, ${formatTimestamp(timestamp)}`}
      >
        {content}
      </Link>
    );
  }
  
  return content;
});

ActivityItemRow.displayName = 'ActivityItemRow';

// =============================================================================
// Loading Skeleton
// =============================================================================

const ActivityFeedSkeleton = memo(function ActivityFeedSkeleton() {
  return (
    <div 
      className="divide-y divide-border-subtle"
      role="status"
      aria-label="Loading recent activity"
      aria-busy="true"
    >
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="flex items-center gap-4 px-4 py-3">
          <div className="w-10 h-10 rounded-lg bg-white/5 animate-pulse motion-reduce:animate-none flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-3/4 bg-white/5 rounded animate-pulse motion-reduce:animate-none" />
            <div className="h-3 w-1/2 bg-white/5 rounded animate-pulse motion-reduce:animate-none" />
          </div>
          <div className="h-3 w-12 bg-white/5 rounded animate-pulse motion-reduce:animate-none flex-shrink-0" />
        </div>
      ))}
      <span className="sr-only">Loading recent activity...</span>
    </div>
  );
});

// =============================================================================
// Empty State
// =============================================================================

const EmptyState = memo(function EmptyState() {
  return (
    <div className="px-4 py-8 text-center">
      <div className="w-12 h-12 rounded-full bg-background-elevated flex items-center justify-center mx-auto mb-3">
        <ClockIcon size="lg" className="text-text-muted" />
      </div>
      <p className="text-sm text-text-muted mb-1">No recent activity</p>
      <p className="text-xs text-text-tertiary">
        Start creating assets to see your activity here
      </p>
    </div>
  );
});

// =============================================================================
// Error State
// =============================================================================

interface ErrorStateProps {
  onRetry?: () => void;
}

const ErrorState = memo(function ErrorState({ onRetry }: ErrorStateProps) {
  return (
    <div className="px-4 py-8 text-center">
      <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-3">
        <ClockIcon size="lg" className="text-red-400" />
      </div>
      <p className="text-sm text-text-muted mb-1">Failed to load activity</p>
      <p className="text-xs text-text-tertiary mb-3">
        Something went wrong while loading your recent activity
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-interactive-400 hover:text-interactive-300 bg-interactive-500/10 hover:bg-interactive-500/20 rounded-lg transition-colors"
        >
          Try again
        </button>
      )}
    </div>
  );
});

// =============================================================================
// Main RecentActivityFeed Component
// =============================================================================

/**
 * Aggregated activity feed for the dashboard overview.
 * 
 * Features:
 * - Aggregates data from assets, brand kits, and jobs
 * - Shows thumbnails for asset activities
 * - Maximum 5 items by default
 * - Loading skeleton and empty state
 * 
 * @example
 * ```tsx
 * <RecentActivityFeed />
 * 
 * // Custom max items
 * <RecentActivityFeed maxItems={3} />
 * 
 * // Without view all link
 * <RecentActivityFeed showViewAll={false} />
 * ```
 */
export const RecentActivityFeed = memo(function RecentActivityFeed({
  maxItems = 5,
  className,
  title = 'Recent Activity',
  showViewAll = true,
}: RecentActivityFeedProps) {
  // Fetch data from existing hooks
  const { data: assetsData, isLoading: assetsLoading, isError: assetsError } = useAssets({ limit: 10 });
  const { data: brandKitsData, isLoading: brandKitsLoading, isError: brandKitsError } = useBrandKits();
  const { data: jobsData, isLoading: jobsLoading, isError: jobsError } = useJobs({ limit: 10 });
  
  const isLoading = assetsLoading || brandKitsLoading || jobsLoading;
  const isError = assetsError || brandKitsError || jobsError;
  
  // Aggregate and sort activities
  const activities = useMemo<RecentActivityItem[]>(() => {
    const items: RecentActivityItem[] = [];
    
    // Add asset activities
    if (assetsData?.assets) {
      assetsData.assets.forEach((asset) => {
        items.push({
          id: `asset-${asset.id}`,
          type: 'asset_created',
          title: `Created ${getAssetTypeLabel(asset.assetType)}`,
          description: `${asset.width}×${asset.height}`,
          timestamp: asset.createdAt,
          imageUrl: asset.url,
          href: `/dashboard/assets?selected=${asset.id}`,
        });
      });
    }
    
    // Add brand kit activities
    if (brandKitsData?.brandKits) {
      brandKitsData.brandKits.forEach((kit) => {
        items.push({
          id: `brandkit-${kit.id}`,
          type: 'brand_kit_updated',
          title: kit.name,
          description: kit.is_active ? 'Active brand kit' : 'Brand kit updated',
          timestamp: kit.updated_at,
          href: `/dashboard/brand-kits/${kit.id}`,
        });
      });
    }
    
    // Add completed job activities
    if (jobsData?.jobs) {
      jobsData.jobs
        .filter((job) => job.status === 'completed')
        .forEach((job) => {
          items.push({
            id: `job-${job.id}`,
            type: 'generation_completed',
            title: 'Generation completed',
            description: job.assetType,
            timestamp: job.completedAt || job.updatedAt,
          });
        });
    }
    
    // Sort by timestamp (newest first) and limit
    return items
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, maxItems);
  }, [assetsData, brandKitsData, jobsData, maxItems]);
  
  return (
    <div className={cn(
      'bg-background-surface/50 border border-border-subtle rounded-xl overflow-hidden',
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle">
        <div className="flex items-center gap-2">
          <LibraryIcon size="sm" className="text-text-muted" />
          <h3 className="font-medium text-text-primary text-sm">{title}</h3>
        </div>
        {showViewAll && activities.length > 0 && (
          <Link
            href="/dashboard/assets"
            className={cn(
              'inline-flex items-center gap-1 text-xs font-medium',
              'text-interactive-500 hover:text-interactive-400',
              'transition-colors motion-reduce:transition-none group',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-interactive-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background-base rounded'
            )}
          >
            View all
            <ArrowRightIcon 
              size="sm" 
              className="transition-transform motion-reduce:transition-none group-hover:translate-x-0.5 motion-reduce:group-hover:translate-x-0" 
              aria-hidden="true"
            />
          </Link>
        )}
      </div>
      
      {/* Content */}
      {isLoading ? (
        <ActivityFeedSkeleton />
      ) : isError ? (
        <ErrorState />
      ) : activities.length > 0 ? (
        <ul 
          className="divide-y divide-border-subtle"
          role="list"
          aria-label="Recent activity items"
        >
          {activities.map((activity) => (
            <li key={activity.id}>
              <ActivityItemRow item={activity} />
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState />
      )}
    </div>
  );
});

RecentActivityFeed.displayName = 'RecentActivityFeed';

export default RecentActivityFeed;
