'use client';

import { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import {
  useCommunityPosts,
  useFeaturedPosts,
  useTrendingPosts,
  useFollowingFeed,
  useLikePost,
  useUnlikePost,
  useFollowUser,
  useUnfollowUser,
  useSpotlightCreators,
  communityKeys,
} from '@aurastream/api-client';
import { useMobileDetection } from '@aurastream/shared';
import {
  HeroCarousel,
  HeroBanner,
  QuickActionCards,
  CreatorSpotlight,
  InspirationGallery,
} from '@/components/community';
import { PageHeader } from '@/components/navigation';
import { PullToRefresh } from '@/components/ui/PullToRefresh';
import { AsyncErrorBoundary } from '@/components/ErrorBoundary';
import { showErrorToast, showSuccessToast } from '@/utils/errorMessages';

type GalleryTab = 'all' | 'featured' | 'following' | 'trending' | 'new';

// Hero banners configuration
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

export default function CommunityPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isMobile } = useMobileDetection();
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
  
  // Spotlight creators always load (shown on all tabs)
  const { data: spotlightCreators, isLoading: creatorsLoading } = useSpotlightCreators(10);

  // Mutations with error handling
  const likeMutation = useLikePost();
  const unlikeMutation = useUnlikePost();
  const followMutation = useFollowUser();
  const unfollowMutation = useUnfollowUser();

  // Error state for banned users
  const [isBanned, setIsBanned] = useState(false);

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
  const handlePostClick = (postId: string) => router.push(`/community/${postId}`);
  const handleAuthorClick = (authorId: string) => router.push(`/community/creators/${authorId}`);
  
  const handleLike = useCallback((postId: string) => {
    const post = posts.find((p) => p.id === postId);
    if (!post) return;
    
    const mutation = post.isLiked ? unlikeMutation : likeMutation;
    mutation.mutate(postId, {
      onError: (error: any) => {
        // Check for banned user error
        if (error?.code === 'COMMUNITY_USER_BANNED' || error?.message?.includes('banned')) {
          setIsBanned(true);
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
  }, [posts, likeMutation, unlikeMutation, router]);

  const handleFollow = useCallback((userId: string) => {
    followMutation.mutate(userId, {
      onSuccess: () => {
        showSuccessToast('Following creator', {
          description: 'You\'ll see their posts in your feed',
        });
      },
      onError: (error: any) => {
        if (error?.code === 'COMMUNITY_USER_BANNED') {
          setIsBanned(true);
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
  }, [followMutation, router]);

  const handleUnfollow = useCallback((userId: string) => {
    unfollowMutation.mutate(userId, {
      onError: (error: any) => {
        showErrorToast(error, {
          onRetry: () => unfollowMutation.mutate(userId),
        });
      },
    });
  }, [unfollowMutation]);

  // Pull-to-refresh handler - invalidates queries based on active tab
  const handleRefresh = useCallback(async () => {
    // Always invalidate spotlight creators
    await queryClient.invalidateQueries({ queryKey: communityKeys.spotlightCreators() });

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

  // Banned user UI
  if (isBanned) {
    return (
      <div className="min-h-screen bg-background-base flex items-center justify-center p-4">
        <div className="max-w-md text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-red-500/10 flex items-center justify-center">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-red-500">
              <circle cx="12" cy="12" r="10" />
              <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-text-primary">Account Restricted</h2>
          <p className="text-text-secondary">
            Your community access has been restricted. If you believe this is an error, please contact our support team.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <button
              onClick={() => router.push('/support')}
              className="px-6 py-2.5 rounded-lg font-medium bg-interactive-600 text-white hover:bg-interactive-500 transition-colors"
            >
              Contact Support
            </button>
            <button
              onClick={() => router.push('/dashboard')}
              className="px-6 py-2.5 rounded-lg font-medium border border-border-subtle text-text-secondary hover:bg-background-elevated transition-colors"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background-base">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 space-y-4">
        <PullToRefresh onRefresh={handleRefresh} disabled={!isMobile}>
          {/* Page Header */}
          <PageHeader 
            title="Community"
            subtitle="Discover and share amazing stream assets"
          />

          {/* Hero Carousel */}
          <HeroCarousel banners={HERO_BANNERS} />

          {/* Quick Action Cards */}
          <section>
            <h2 className="text-sm font-semibold text-text-primary mb-2">
              What would you like to create today?
            </h2>
            <QuickActionCards />
          </section>

          {/* Creator Spotlight with Error Boundary */}
          <AsyncErrorBoundary
            resourceName="spotlight creators"
            onRefetch={() => queryClient.invalidateQueries({ queryKey: communityKeys.spotlightCreators() })}
          >
            <CreatorSpotlight
              creators={spotlightCreators ?? []}
              isLoading={creatorsLoading}
              onFollow={handleFollow}
              onUnfollow={handleUnfollow}
            />
          </AsyncErrorBoundary>

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
    </div>
  );
}
