'use client';

/**
 * CreatorSpotlightContent Component
 * 
 * Full tab content for the Creators section of the Community Hub.
 * Displays spotlight creators with follow/unfollow functionality,
 * search, filtering, and "View all creators" capability.
 * 
 * @module components/community/CreatorSpotlightContent
 */

import { useState, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import {
  useSpotlightCreators,
  useFollowUser,
  useUnfollowUser,
  communityKeys,
} from '@aurastream/api-client';
import { useMobileDetection } from '@aurastream/shared';
import { FollowButton } from './FollowButton';
import { PullToRefresh } from '@/components/ui/PullToRefresh';
import { AsyncErrorBoundary } from '@/components/ErrorBoundary';
import { Skeleton } from '@/components/ui/Skeleton';
import { showErrorToast, showSuccessToast } from '@/utils/errorMessages';
import { cn } from '@/lib/utils';

// =============================================================================
// Types
// =============================================================================

/** Spotlight creator data structure */
export interface SpotlightCreator {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  followerCount: number;
  followingCount: number;
  isFollowing: boolean;
  recentAssets: { id: string; url: string; type: string }[];
  bio?: string;
}

/** Props for CreatorSpotlightContent component */
export interface CreatorSpotlightContentProps {
  /** Optional className for the container */
  className?: string;
  /** Callback when user is banned */
  onBanned?: () => void;
}

/** Filter options for creators */
type CreatorFilter = 'all' | 'following' | 'popular';

// =============================================================================
// Constants
// =============================================================================

const FILTER_OPTIONS: { value: CreatorFilter; label: string }[] = [
  { value: 'all', label: 'All Creators' },
  { value: 'following', label: 'Following' },
  { value: 'popular', label: 'Most Popular' },
];

// =============================================================================
// Sub-Components
// =============================================================================

/**
 * Search icon component
 */
function SearchIcon() {
  return (
    <svg 
      width="18" 
      height="18" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
    </svg>
  );
}

/**
 * Users icon component
 */
function UsersIcon({ className }: { className?: string }) {
  return (
    <svg 
      className={className}
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

/**
 * Creator card component for grid display
 */
interface CreatorCardProps {
  creator: SpotlightCreator;
  onFollow: (userId: string) => void;
  onUnfollow: (userId: string) => void;
  isFollowPending?: boolean;
}

function CreatorCard({ creator, onFollow, onUnfollow, isFollowPending }: CreatorCardProps) {
  const displayAssets = creator.recentAssets.slice(0, 6);
  
  return (
    <article 
      className="rounded-xl border border-border-subtle bg-background-surface overflow-hidden hover:border-border-default hover:shadow-lg transition-all duration-200 group"
      aria-label={`Creator: ${creator.displayName}`}
    >
      {/* Header with Avatar and Info */}
      <Link 
        href={`/community/creators/${creator.id}`} 
        className="block p-4 pb-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-interactive-500 focus-visible:ring-inset"
      >
        <div className="flex items-start gap-3">
          {/* Avatar */}
          {creator.avatarUrl ? (
            <img
              src={creator.avatarUrl}
              alt=""
              className="w-12 h-12 rounded-full object-cover border-2 border-border-subtle group-hover:border-interactive-500/50 transition-colors"
              loading="lazy"
              decoding="async"
            />
          ) : (
            <div 
              className="w-12 h-12 rounded-full bg-interactive-500 flex items-center justify-center text-lg font-bold text-white"
              aria-hidden="true"
            >
              {creator.displayName.charAt(0).toUpperCase()}
            </div>
          )}
          
          {/* Info */}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-text-primary text-sm truncate group-hover:text-interactive-400 transition-colors">
              {creator.displayName}
            </h3>
            <div className="flex items-center gap-3 mt-0.5 text-xs text-text-muted">
              <span>{creator.followerCount.toLocaleString()} followers</span>
              <span className="text-text-disabled">•</span>
              <span>{creator.recentAssets.length} assets</span>
            </div>
            {creator.bio && (
              <p className="mt-1.5 text-xs text-text-secondary line-clamp-2">
                {creator.bio}
              </p>
            )}
          </div>
        </div>
      </Link>

      {/* Recent Assets Grid */}
      {displayAssets.length > 0 && (
        <div className="px-4 pb-2">
          <div className="grid grid-cols-6 gap-1 rounded-lg overflow-hidden">
            {displayAssets.map((asset) => (
              <div 
                key={asset.id} 
                className="aspect-square bg-background-elevated overflow-hidden"
              >
                <img
                  src={asset.url}
                  alt=""
                  className="w-full h-full object-cover hover:scale-110 transition-transform duration-200"
                  loading="lazy"
                  decoding="async"
                />
              </div>
            ))}
            {/* Fill empty slots */}
            {Array.from({ length: Math.max(0, 6 - displayAssets.length) }).map((_, i) => (
              <div 
                key={`empty-${i}`} 
                className="aspect-square bg-background-elevated" 
                aria-hidden="true"
              />
            ))}
          </div>
        </div>
      )}

      {/* Follow Button */}
      <div className="p-4 pt-2 border-t border-border-subtle/50">
        <FollowButton
          isFollowing={creator.isFollowing}
          onToggle={() => creator.isFollowing ? onUnfollow(creator.id) : onFollow(creator.id)}
          size="sm"
          className="w-full"
          isLoading={isFollowPending}
        />
      </div>
    </article>
  );
}

/**
 * Skeleton for creator card while loading
 */
function CreatorCardSkeleton() {
  return (
    <div 
      className="rounded-xl border border-border-subtle bg-background-surface overflow-hidden animate-pulse"
      role="status"
      aria-label="Loading creator..."
    >
      <div className="p-4 pb-3">
        <div className="flex items-start gap-3">
          <Skeleton width={48} height={48} rounded="full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-3 w-full" />
          </div>
        </div>
      </div>
      <div className="px-4 pb-2">
        <div className="grid grid-cols-6 gap-1 rounded-lg overflow-hidden">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square" rounded="none" />
          ))}
        </div>
      </div>
      <div className="p-4 pt-2 border-t border-border-subtle/50">
        <Skeleton className="h-8 w-full rounded-lg" />
      </div>
    </div>
  );
}

/**
 * Empty state when no creators found
 */
function EmptyState({ filter, searchQuery }: { filter: CreatorFilter; searchQuery: string }) {
  const getContent = () => {
    if (searchQuery) {
      return {
        title: 'No creators found',
        description: `No creators match "${searchQuery}". Try a different search term.`,
      };
    }
    
    switch (filter) {
      case 'following':
        return {
          title: 'Not following anyone yet',
          description: 'Follow creators to see their work in your feed and stay updated.',
        };
      default:
        return {
          title: 'No creators to show',
          description: 'Be the first to share your creations with the community!',
        };
    }
  };

  const content = getContent();

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="w-16 h-16 rounded-full bg-background-elevated flex items-center justify-center mb-4">
        <UsersIcon className="w-8 h-8 text-text-muted" />
      </div>
      <h3 className="text-lg font-medium text-text-primary mb-2">{content.title}</h3>
      <p className="text-text-muted text-center max-w-md">{content.description}</p>
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

/**
 * CreatorSpotlightContent - Full tab content for the Creators section.
 * 
 * Features:
 * - Grid display of spotlight creators
 * - Search functionality
 * - Filter by all/following/popular
 * - Follow/unfollow with optimistic updates
 * - Pull-to-refresh on mobile
 * - Error boundaries for resilience
 * - Accessible with ARIA labels and keyboard navigation
 * 
 * @example
 * ```tsx
 * // Basic usage
 * <CreatorSpotlightContent />
 * 
 * // With banned callback
 * <CreatorSpotlightContent onBanned={() => setIsBanned(true)} />
 * ```
 */
export function CreatorSpotlightContent({
  className,
  onBanned,
}: CreatorSpotlightContentProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isMobile } = useMobileDetection();
  
  // Local state
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<CreatorFilter>('all');

  // Fetch spotlight creators (backend max is 20)
  const { data: spotlightCreators, isLoading } = useSpotlightCreators(20);

  // Mutations
  const followMutation = useFollowUser();
  const unfollowMutation = useUnfollowUser();

  // Filter and search creators
  const filteredCreators = useMemo(() => {
    let result = spotlightCreators ?? [];

    // Apply filter
    switch (filter) {
      case 'following':
        result = result.filter((c) => c.isFollowing);
        break;
      case 'popular':
        result = [...result].sort((a, b) => b.followerCount - a.followerCount);
        break;
    }

    // Apply search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter((c) => 
        c.displayName.toLowerCase().includes(q)
      );
    }

    return result;
  }, [spotlightCreators, filter, searchQuery]);

  // Handlers
  const handleFollow = useCallback((userId: string) => {
    followMutation.mutate(userId, {
      onSuccess: () => {
        showSuccessToast('Following creator', {
          description: "You'll see their posts in your feed",
        });
        // Invalidate to refresh following status
        queryClient.invalidateQueries({ queryKey: communityKeys.spotlightCreators() });
      },
      onError: (error: any) => {
        if (error?.code === 'COMMUNITY_USER_BANNED') {
          onBanned?.();
          showErrorToast({ code: 'COMMUNITY_USER_BANNED' }, {
            onContact: () => router.push('/support'),
          });
        } else {
          showErrorToast(error, {
            onRetry: () => followMutation.mutate(userId),
          });
        }
      },
    });
  }, [followMutation, queryClient, router, onBanned]);

  const handleUnfollow = useCallback((userId: string) => {
    unfollowMutation.mutate(userId, {
      onSuccess: () => {
        // Invalidate to refresh following status
        queryClient.invalidateQueries({ queryKey: communityKeys.spotlightCreators() });
      },
      onError: (error: any) => {
        showErrorToast(error, {
          onRetry: () => unfollowMutation.mutate(userId),
        });
      },
    });
  }, [unfollowMutation, queryClient]);

  const handleRefresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: communityKeys.spotlightCreators() });
  }, [queryClient]);

  const isFollowPending = followMutation.isPending || unfollowMutation.isPending;

  return (
    <div className={cn('', className)}>
      <PullToRefresh onRefresh={handleRefresh} disabled={!isMobile}>
        {/* Header */}
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-text-primary">Discover Creators</h2>
              <p className="text-sm text-text-muted">
                Find talented creators and follow their work
              </p>
            </div>
            
            {/* View All Link */}
            <Link
              href="/community/creators"
              className="hidden md:flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-interactive-400 hover:text-interactive-300 hover:bg-interactive-500/10 rounded-lg transition-colors"
            >
              View all creators
              <svg 
                width="16" 
                height="16" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2"
                aria-hidden="true"
              >
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </Link>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-text-muted">
                <SearchIcon />
              </div>
              <input
                type="search"
                placeholder="Search creators..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={cn(
                  'w-full h-10 pl-10 pr-4 rounded-lg border border-border-subtle bg-background-surface text-text-primary text-sm',
                  'placeholder:text-text-muted',
                  'focus:outline-none focus:ring-2 focus:ring-interactive-500 focus:border-interactive-500',
                  'hover:border-border-default transition-colors'
                )}
                aria-label="Search creators"
              />
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1 p-1 bg-background-elevated/50 rounded-lg w-fit">
              {FILTER_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setFilter(option.value)}
                  className={cn(
                    'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                    filter === option.value
                      ? 'bg-interactive-600/20 text-interactive-400'
                      : 'text-text-secondary hover:text-text-primary hover:bg-background-elevated/50'
                  )}
                  aria-pressed={filter === option.value}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Creators Grid */}
        <AsyncErrorBoundary
          resourceName="creators"
          onRefetch={handleRefresh}
        >
          {isLoading ? (
            <div 
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
              role="status"
              aria-label="Loading creators..."
            >
              {Array.from({ length: 8 }).map((_, i) => (
                <CreatorCardSkeleton key={i} />
              ))}
            </div>
          ) : filteredCreators.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredCreators.map((creator) => (
                <CreatorCard
                  key={creator.id}
                  creator={creator}
                  onFollow={handleFollow}
                  onUnfollow={handleUnfollow}
                  isFollowPending={isFollowPending}
                />
              ))}
            </div>
          ) : (
            <EmptyState filter={filter} searchQuery={searchQuery} />
          )}
        </AsyncErrorBoundary>

        {/* Mobile View All Link */}
        <div className="mt-6 md:hidden">
          <Link
            href="/community/creators"
            className="flex items-center justify-center gap-2 w-full py-3 text-sm font-medium text-interactive-400 hover:text-interactive-300 border border-border-subtle hover:border-interactive-500/50 rounded-lg transition-colors"
          >
            View all creators
            <svg 
              width="16" 
              height="16" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2"
              aria-hidden="true"
            >
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </PullToRefresh>
    </div>
  );
}

export default CreatorSpotlightContent;
