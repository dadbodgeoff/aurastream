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

type GalleryTab = 'all' | 'featured' | 'following' | 'trending' | 'new';

// Hero banners configuration
const HERO_BANNERS: HeroBanner[] = [
  {
    id: 'welcome',
    title: 'Create Stunning Stream Assets',
    subtitle: 'AI-powered graphics for Twitch, YouTube, and more. Join thousands of creators.',
    ctaText: 'Start Creating',
    ctaHref: '/dashboard/create',
    bgGradient: 'bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400',
    badge: '✨ New',
  },
  {
    id: 'vibe',
    title: 'Vibe Branding',
    subtitle: 'Upload any image and extract a complete brand kit instantly with AI.',
    ctaText: 'Try Vibe Branding',
    ctaHref: '/dashboard/vibe-branding',
    bgGradient: 'bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500',
    badge: '🎨 Popular',
  },
  {
    id: 'community',
    title: 'Share Your Creations',
    subtitle: 'Join our community of creators. Share, discover, and get inspired.',
    ctaText: 'Explore Gallery',
    ctaHref: '#gallery',
    bgGradient: 'bg-gradient-to-br from-blue-600 via-indigo-500 to-purple-500',
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

  // Mutations
  const likeMutation = useLikePost();
  const unlikeMutation = useUnlikePost();
  const followMutation = useFollowUser();
  const unfollowMutation = useUnfollowUser();

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

  // Handlers
  const handlePostClick = (postId: string) => router.push(`/community/${postId}`);
  const handleAuthorClick = (authorId: string) => router.push(`/community/creators/${authorId}`);
  const handleLike = (postId: string) => {
    const post = posts.find((p) => p.id === postId);
    if (!post) return;
    if (post.isLiked) unlikeMutation.mutate(postId);
    else likeMutation.mutate(postId);
  };
  const handleFollow = (userId: string) => followMutation.mutate(userId);
  const handleUnfollow = (userId: string) => unfollowMutation.mutate(userId);

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

  return (
    <div className="min-h-screen bg-background-base">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
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
            <h2 className="text-lg font-semibold text-text-primary mb-4">
              What would you like to create today?
            </h2>
            <QuickActionCards />
          </section>

          {/* Creator Spotlight */}
          <CreatorSpotlight
            creators={spotlightCreators ?? []}
            isLoading={creatorsLoading}
            onFollow={handleFollow}
            onUnfollow={handleUnfollow}
          />

          {/* Inspiration Gallery */}
          <div id="gallery">
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
            />
          </div>
        </PullToRefresh>
      </div>
    </div>
  );
}
