'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { PostCard, PostCardProps } from './PostCard';

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

function PostSkeleton() {
  return (
    <div className="rounded-2xl border border-border-subtle overflow-hidden bg-background-surface animate-pulse">
      <div className="aspect-square bg-background-elevated" />
      <div className="p-4 space-y-3">
        <div className="h-4 bg-background-elevated rounded w-3/4" />
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-background-elevated" />
          <div className="h-3 bg-background-elevated rounded w-20" />
        </div>
        <div className="flex gap-2">
          <div className="h-5 bg-background-elevated rounded-full w-12" />
          <div className="h-5 bg-background-elevated rounded-full w-16" />
        </div>
      </div>
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
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
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
            />
          ))}
        </div>
      ) : (
        <div className="py-16 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-background-elevated flex items-center justify-center">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-text-muted">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <path d="M21 15l-5-5L5 21" />
            </svg>
          </div>
          <p className="text-text-muted">No posts found. Be the first to share your creations!</p>
        </div>
      )}
    </section>
  );
}
