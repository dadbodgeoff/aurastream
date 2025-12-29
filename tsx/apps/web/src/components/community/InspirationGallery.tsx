'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { PostCard, PostCardProps } from './PostCard';
import { Skeleton } from '@/components/ui/Skeleton';

type GalleryTab = 'all' | 'featured' | 'following' | 'trending' | 'new';

interface InspirationGalleryProps {
  posts: Omit<PostCardProps, 'onClick' | 'onLike' | 'onAuthorClick'>[];
  isLoading?: boolean;
  activeTab: GalleryTab;
  onTabChange: (tab: GalleryTab) => void;
  assetTypeFilter?: string;
  onAssetTypeChange: (type: string | undefined) => void;
  searchQuery?: string;
  onSearchChange: (query: string) => void;
  onPostClick: (postId: string) => void;
  onLike: (postId: string) => void;
  onAuthorClick: (authorId: string) => void;
  isLiking?: boolean;
  className?: string;
}

const TABS: { id: GalleryTab; label: string; icon?: React.ReactNode }[] = [
  { id: 'all', label: 'All' },
  { id: 'featured', label: 'Featured', icon: <span>⭐</span> },
  { id: 'following', label: 'Following' },
  { id: 'trending', label: 'Trending', icon: <span>🔥</span> },
  { id: 'new', label: 'New' },
];

const ASSET_TYPES = [
  { value: '', label: 'All Types' },
  { value: 'twitch_emote', label: 'Emotes' },
  { value: 'twitch_banner', label: 'Banners' },
  { value: 'twitch_badge', label: 'Badges' },
  { value: 'overlay', label: 'Overlays' },
  { value: 'youtube_thumbnail', label: 'Thumbnails' },
];

function SearchIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
    </svg>
  );
}

/**
 * Enterprise-grade post skeleton with shimmer animation
 */
function PostSkeleton() {
  return (
    <div 
      className="rounded-2xl border border-border-subtle overflow-hidden bg-background-surface"
      role="status"
      aria-label="Loading post..."
    >
      <Skeleton className="aspect-square w-full" rounded="none" />
      <div className="p-4 space-y-3">
        <Skeleton className="h-4 w-3/4" />
        <div className="flex items-center gap-2">
          <Skeleton width={24} height={24} rounded="full" />
          <Skeleton className="h-3 w-20" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-5 w-12" rounded="full" />
          <Skeleton className="h-5 w-16" rounded="full" />
        </div>
        <div className="flex items-center gap-4 pt-3 border-t border-border-subtle">
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-4 w-12" />
        </div>
      </div>
    </div>
  );
}

/**
 * Empty state component with context-aware messaging
 */
function EmptyState({ 
  activeTab, 
  searchQuery 
}: { 
  activeTab: GalleryTab; 
  searchQuery?: string;
}) {
  const getEmptyStateContent = () => {
    if (searchQuery) {
      return {
        icon: (
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-text-muted">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
        ),
        title: 'No results found',
        description: `No posts match "${searchQuery}". Try a different search term.`,
        cta: null,
      };
    }

    switch (activeTab) {
      case 'following':
        return {
          icon: (
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-text-muted">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          ),
          title: 'Follow creators to see their posts',
          description: 'When you follow creators, their posts will appear here.',
          cta: { label: 'Discover Creators', href: '#spotlight' },
        };
      case 'featured':
        return {
          icon: (
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-text-muted">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          ),
          title: 'No featured posts yet',
          description: 'Check back soon for hand-picked community highlights.',
          cta: { label: 'Browse All Posts', action: 'all' },
        };
      case 'trending':
        return {
          icon: (
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-text-muted">
              <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
              <polyline points="17 6 23 6 23 12" />
            </svg>
          ),
          title: 'No trending posts right now',
          description: 'Be the first to share something amazing!',
          cta: { label: 'Share Your Work', href: '/dashboard/assets' },
        };
      default:
        return {
          icon: (
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-text-muted">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <path d="M21 15l-5-5L5 21" />
            </svg>
          ),
          title: 'No posts yet',
          description: 'Be the first to share your creations with the community!',
          cta: { label: 'Create Your First Asset', href: '/dashboard/create' },
        };
    }
  };

  const content = getEmptyStateContent();

  return (
    <div className="py-16 text-center">
      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-background-elevated flex items-center justify-center">
        {content.icon}
      </div>
      <h3 className="text-lg font-medium text-text-primary mb-2">{content.title}</h3>
      <p className="text-text-muted mb-6 max-w-md mx-auto">{content.description}</p>
      {content.cta && (
        <a
          href={content.cta.href || '#'}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-interactive-600 text-white font-medium text-sm hover:bg-interactive-500 transition-colors"
        >
          {content.cta.label}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </a>
      )}
    </div>
  );
}

export function InspirationGallery({
  posts,
  isLoading,
  activeTab,
  onTabChange,
  assetTypeFilter,
  onAssetTypeChange,
  searchQuery = '',
  onSearchChange,
  onPostClick,
  onLike,
  onAuthorClick,
  isLiking,
  className,
}: InspirationGalleryProps) {
  return (
    <section className={cn('', className)}>
      {/* Header */}
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-text-primary">More Inspiration</h2>
          
          {/* Search */}
          <div className="relative w-64 hidden md:block">
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-text-muted">
              <SearchIcon />
            </div>
            <input
              type="search"
              placeholder="Search posts..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className={cn(
                'w-full h-9 pl-10 pr-4 rounded-lg border border-border-subtle bg-background-surface text-text-primary text-sm',
                'placeholder:text-text-muted',
                'focus:outline-none focus:ring-2 focus:ring-interactive-500 focus:border-interactive-500',
                'hover:border-border-default transition-colors'
              )}
            />
          </div>
        </div>

        {/* Tabs & Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
          {/* Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 -mx-1 px-1">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors',
                  activeTab === tab.id
                    ? 'bg-interactive-500 text-white'
                    : 'text-text-muted hover:text-text-primary hover:bg-background-elevated'
                )}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          {/* Asset Type Filter */}
          <div className="flex items-center gap-2 sm:ml-auto">
            <select
              value={assetTypeFilter ?? ''}
              onChange={(e) => onAssetTypeChange(e.target.value || undefined)}
              className={cn(
                'h-9 px-3 pr-8 rounded-lg border border-border-subtle bg-background-surface text-text-primary text-sm',
                'appearance-none cursor-pointer',
                'focus:outline-none focus:ring-2 focus:ring-interactive-500',
                'hover:border-border-default transition-colors',
                'bg-[url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%236b7280\' stroke-width=\'2\'%3E%3Cpath d=\'m6 9 6 6 6-6\'/%3E%3C/svg%3E")] bg-no-repeat bg-[right_0.75rem_center]'
              )}
            >
              {ASSET_TYPES.map((type) => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Mobile Search */}
        <div className="relative md:hidden">
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-text-muted">
            <SearchIcon />
          </div>
          <input
            type="search"
            placeholder="Search posts..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className={cn(
              'w-full h-10 pl-10 pr-4 rounded-lg border border-border-subtle bg-background-surface text-text-primary text-sm',
              'placeholder:text-text-muted',
              'focus:outline-none focus:ring-2 focus:ring-interactive-500'
            )}
          />
        </div>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div 
          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4"
          role="status"
          aria-label="Loading community posts..."
        >
          {Array.from({ length: 10 }).map((_, i) => (
            <PostSkeleton key={i} />
          ))}
        </div>
      ) : posts.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {posts.map((post) => (
            <PostCard
              key={post.id}
              {...post}
              onClick={() => onPostClick(post.id)}
              onLike={() => onLike(post.id)}
              onAuthorClick={() => onAuthorClick(post.author.id)}
              isLiking={isLiking}
            />
          ))}
        </div>
      ) : (
        <EmptyState activeTab={activeTab} searchQuery={searchQuery} />
      )}
    </section>
  );
}
