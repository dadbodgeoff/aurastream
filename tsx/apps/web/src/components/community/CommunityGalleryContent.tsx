'use client';

/**
 * CommunityGalleryContent Component
 * 
 * Standalone gallery content extracted from the community page.
 * Displays community posts with filtering, search, and infinite scroll.
 * Can be rendered inside a tab or as standalone content.
 * 
 * @module components/community/CommunityGalleryContent
 */

import { useState, useMemo, useCallback, Suspense, lazy } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import {
  useCommunityPosts,
  useFeaturedPosts,
  useTrendingPosts,
  useFollowingFeed,
  useLikePost,
  useUnlikePost,
  communityKeys,
} from '@aurastream/api-client';
import { useMobileDetection } from '@aurastream/shared';
import { InspirationGallery } from './InspirationGallery';
import { HeroCarousel, HeroBanner } from './HeroCarousel';
import { QuickActionCards } from './QuickActionCards';
import { PullToRefresh } from '@/components/ui/PullToRefresh';
import { AsyncErrorBoundary } from '@/components/ErrorBoundary';
import { Skeleton } from '@/components/ui/Skeleton';
import { showErrorToast } from '@/utils/errorMessages';
import { cn } from '@/lib/utils';

// =============================================================================
// Types
// =============================================================================

/** Gallery tab filter options */
export type GalleryTab = 'all' | 'featured' | 'following' | 'trending' | 'new';

/** Props for CommunityGalleryContent component */
export interface CommunityGalleryContentProps {
  /** Optional className for the container */
  className?: string;
  /** Whether to show the hero carousel */
  showHero?: boolean;
  /** Whether to show quick action cards */
  showQuickActions?: boolean;
  /** Callback when user is banned */
  onBanned?: () => void;
}

// =============================================================================
// Constants
// =============================================================================

/** Hero banners configuration */
const HERO_BANNERS: HeroBanner[] = [
  {
    id: 'welcome',
    title: 'Create Stunning Stream Assets',
    subtitle: 'AI-powered graphics for Twitch, YouTube, and more. Join thousands of creators.',
    ctaText: 'Start Creating',
    ctaHref: '/dashboard/create',
    bgGradient: 'bg-gradient-to-br from-primary-600 via-primary-500 to-accent-400',
    badge: '✨ New',
    image: 'https://qgyvdadgdomnubngfpun.supabase.co/storage/v1/object/public/banners/twitch-slide.jpg',
  },
  {
    id: 'vibe',
    title: 'Vibe Branding',
    subtitle: 'Upload any image and extract a complete brand kit instantly with AI.',
    ctaText: 'Try Vibe Branding',
    ctaHref: '/dashboard/vibe-branding',
    bgGradient: 'bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500',
    badge: '🎨 Popular',
    image: 'https://qgyvdadgdomnubngfpun.supabase.co/storage/v1/object/public/banners/vibe-branding-slide.jpg',
  },
  {
    id: 'community',
    title: 'Share Your Creations',
    subtitle: 'Join our community of creators. Share, discover, and get inspired.',
    ctaText: 'Explore Gallery',
    ctaHref: '#gallery',
    bgGradient: 'bg-gradient-to-br from-primary-600 via-primary-500 to-interactive-500',
    image: 'https://qgyvdadgdomnubngfpun.supabase.co/storage/v1/object/public/banners/community-slide.jpg',
  },
];

// =============================================================================
// Skeleton Components
// =============================================================================

/**
 * Skeleton for the gallery content while loading
 */
function GalleryContentSkeleton() {
  return (
    <div className="space-y-6" role="status" aria-label="Loading gallery...">
      {/* Hero skeleton */}
      <Skeleton className="w-full h-48 md:h-64 rounded-xl" />
      
      {/* Quick actions skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-48" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-lg" />
          ))}
        </div>
      </div>
      
      {/* Gallery skeleton */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-9 w-64" />
        </div>
        <div className="flex gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-20 rounded-full" />
          ))}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-border-subtle overflow-hidden">
              <Skeleton className="aspect-square w-full" rounded="none" />
              <div className="p-4 space-y-3">
                <Skeleton className="h-4 w-3/4" />
                <div className="flex items-center gap-2">
                  <Skeleton width={24} height={24} rounded="full" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

/**
 * CommunityGalleryContent - Standalone gallery content for the community hub.
 * 
 * Features:
 * - Multiple gallery tabs (All, Featured, Following, Trending, New)
 * - Asset type filtering
 * - Search functionality
 * - Like/unlike posts
 * - Pull-to-refresh on mobile
 * - Error boundaries for resilience
 * - Accessible with ARIA labels and keyboard navigation
 * 
 * @example
 * ```tsx
 * // Basic usage
 * <CommunityGalleryContent />
 * 
 * // Without hero and quick actions (for tab content)
 * <CommunityGalleryContent showHero={false} showQuickActions={false} />
 * 
 * // With banned callback
 * <CommunityGalleryContent onBanned={() => setIsBanned(true)} />
 * ```
 */
export function CommunityGalleryContent({
  className,
  showHero = true,
  showQuickActions = true,
  onBanned,
}: CommunityGalleryContentProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isMobile } = useMobileDetection();
  
  // Local state for filters
  const [activeTab, setActiveTab] = useState<GalleryTab>('all');
  const [assetType, setAssetType] = useState<string | undefined>();
  const [searchQuery, setSearchQuery] = useState('');

  // Determine sort based on active tab
  const sort = useMemo(() => {
    switch (activeTab) {
      case 'trending': return 'trending' as const;
      case 'new': return 'recent' as const;
      case 'featured': return 'most_liked' as const;
      default: return 'trending' as const;
    }
  }, [activeTab]);

  // Conditional fetching - only fetch data for active tab
  const shouldFetchAll = activeTab === 'all' || activeTab === 'new';
  const shouldFetchFeatured = activeTab === 'featured';
  const shouldFetchTrending = activeTab === 'trending';
  const shouldFetchFollowing = activeTab === 'following';

  // Fetch data based on active tab (conditional)
  const { data: allPostsData, isLoading: allLoading } = useCommunityPosts(
    shouldFetchAll ? { sort, assetType, search: searchQuery || undefined } : undefined
  );
  const { data: featuredPosts, isLoading: featuredLoading } = useFeaturedPosts(20, shouldFetchFeatured);
  const { data: trendingPosts, isLoading: trendingLoading } = useTrendingPosts(assetType, 20, shouldFetchTrending);
  const { data: followingData, isLoading: followingLoading } = useFollowingFeed(undefined, shouldFetchFollowing);

  // Mutations with error handling
  const likeMutation = useLikePost();
  const unlikeMutation = useUnlikePost();

  // Get posts based on active tab
  const { posts, isLoading } = useMemo(() => {
    switch (activeTab) {
      case 'featured':
        return { posts: featuredPosts ?? [], isLoading: featuredLoading };
      case 'trending':
        return { posts: trendingPosts ?? [], isLoading: trendingLoading };
      case 'following':
        return { posts: followingData?.items ?? [], isLoading: followingLoading };
      case 'new':
      case 'all':
      default:
        return { posts: allPostsData?.items ?? [], isLoading: allLoading };
    }
  }, [activeTab, allPostsData, featuredPosts, trendingPosts, followingData, allLoading, featuredLoading, trendingLoading, followingLoading]);

  // Filter posts by search query (client-side for featured/trending)
  const filteredPosts = useMemo(() => {
    if (!searchQuery) return posts;
    const q = searchQuery.toLowerCase();
    return posts.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.author.displayName.toLowerCase().includes(q) ||
        p.tags.some((t) => t.toLowerCase().includes(q))
    );
  }, [posts, searchQuery]);

  // Handlers with enterprise error handling
  const handlePostClick = useCallback((postId: string) => {
    router.push(`/community/${postId}`);
  }, [router]);

  const handleAuthorClick = useCallback((authorId: string) => {
    router.push(`/community/creators/${authorId}`);
  }, [router]);
  
  const handleLike = useCallback((postId: string) => {
    const post = posts.find((p) => p.id === postId);
    if (!post) return;
    
    const mutation = post.isLiked ? unlikeMutation : likeMutation;
    mutation.mutate(postId, {
      onError: (error: any) => {
        // Check for banned user error
        if (error?.code === 'COMMUNITY_USER_BANNED' || error?.message?.includes('banned')) {
          onBanned?.();
          showErrorToast({ code: 'COMMUNITY_USER_BANNED' }, {
            onContact: () => router.push('/support'),
          });
        } else {
          showErrorToast(error, {
            onRetry: () => mutation.mutate(postId),
          });
        }
      },
    });
  }, [posts, likeMutation, unlikeMutation, router, onBanned]);

  // Pull-to-refresh handler - invalidates queries based on active tab
  const handleRefresh = useCallback(async () => {
    // Invalidate queries based on active tab
    switch (activeTab) {
      case 'featured':
        await queryClient.invalidateQueries({ queryKey: communityKeys.featured() });
        break;
      case 'trending':
        await queryClient.invalidateQueries({ queryKey: communityKeys.trending(assetType) });
        break;
      case 'following':
        await queryClient.invalidateQueries({ queryKey: communityKeys.followingFeed() });
        break;
      case 'all':
      case 'new':
      default:
        await queryClient.invalidateQueries({ queryKey: communityKeys.postsList() });
        break;
    }
  }, [queryClient, activeTab, assetType]);

  return (
    <div className={cn('space-y-6', className)}>
      <PullToRefresh onRefresh={handleRefresh} disabled={!isMobile}>
        {/* Hero Carousel */}
        {showHero && <HeroCarousel banners={HERO_BANNERS} />}

        {/* Quick Action Cards */}
        {showQuickActions && (
          <section>
            <h2 className="text-sm font-semibold text-text-primary mb-2">
              What would you like to create today?
            </h2>
            <QuickActionCards />
          </section>
        )}

        {/* Inspiration Gallery with Error Boundary */}
        <div id="gallery">
          <AsyncErrorBoundary
            resourceName="community posts"
            onRefetch={handleRefresh}
          >
            <InspirationGallery
              posts={filteredPosts.map((post) => ({
                id: post.id,
                title: post.title,
                assetUrl: post.assetUrl,
                assetType: post.assetType,
                author: post.author,
                likeCount: post.likeCount,
                commentCount: post.commentCount,
                tags: post.tags,
                isFeatured: post.isFeatured,
                isLiked: post.isLiked,
              }))}
              isLoading={isLoading}
              activeTab={activeTab}
              onTabChange={setActiveTab}
              assetTypeFilter={assetType}
              onAssetTypeChange={setAssetType}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              onPostClick={handlePostClick}
              onLike={handleLike}
              onAuthorClick={handleAuthorClick}
              isLiking={likeMutation.isPending || unlikeMutation.isPending}
            />
          </AsyncErrorBoundary>
        </div>
      </PullToRefresh>
    </div>
  );
}

export default CommunityGalleryContent;
