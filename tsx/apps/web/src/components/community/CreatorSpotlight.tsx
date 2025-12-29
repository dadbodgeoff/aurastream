'use client';

import { useRef } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { FollowButton } from './FollowButton';

export interface SpotlightCreator {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  followerCount: number;
  followingCount: number;
  isFollowing: boolean;
  recentAssets: { id: string; url: string; type: string }[];
}

interface CreatorCardProps {
  creator: SpotlightCreator;
  onFollow: (userId: string) => void;
  onUnfollow: (userId: string) => void;
}

function CreatorCard({ creator, onFollow, onUnfollow }: CreatorCardProps) {
  const displayAssets = creator.recentAssets.slice(0, 4);
  
  return (
    <div className="flex-shrink-0 w-[180px] md:w-[200px] rounded-xl border border-border-subtle bg-background-surface overflow-hidden shadow-sm hover:shadow-md hover:border-border-default transition-all">
      {/* Header with Avatar */}
      <Link href={`/community/creators/${creator.id}`} className="block p-4 pb-2">
        <div className="flex flex-col items-center text-center">
          {/* Avatar */}
          {creator.avatarUrl ? (
            <img
              src={creator.avatarUrl}
              alt={creator.displayName}
              className="w-14 h-14 rounded-full object-cover border-2 border-border-subtle"
            />
          ) : (
            <div className="w-14 h-14 rounded-full bg-interactive-500/20 flex items-center justify-center text-xl font-bold text-interactive-500">
              {creator.displayName.charAt(0).toUpperCase()}
            </div>
          )}
          
          {/* Name */}
          <h3 className="mt-2 font-semibold text-text-primary text-sm truncate w-full">
            {creator.displayName}
          </h3>
          
          {/* Stats */}
          <div className="flex items-center gap-3 mt-1 text-xs text-text-muted">
            <span>{creator.followerCount.toLocaleString()} followers</span>
          </div>
        </div>
      </Link>

      {/* Recent Assets Grid */}
      <div className="grid grid-cols-4 gap-0.5 px-2">
        {displayAssets.map((asset) => (
          <div key={asset.id} className="aspect-square bg-background-elevated overflow-hidden rounded-sm">
            <img
              src={asset.url}
              alt=""
              className="w-full h-full object-cover hover:scale-110 transition-transform"
              loading="lazy"
            />
          </div>
        ))}
        {/* Fill empty slots */}
        {Array.from({ length: Math.max(0, 4 - displayAssets.length) }).map((_, i) => (
          <div key={`empty-${i}`} className="aspect-square bg-background-elevated rounded-sm" />
        ))}
      </div>

      {/* Follow Button */}
      <div className="p-3">
        <FollowButton
          isFollowing={creator.isFollowing}
          onToggle={() => creator.isFollowing ? onUnfollow(creator.id) : onFollow(creator.id)}
          size="sm"
          className="w-full"
        />
      </div>
    </div>
  );
}

interface CreatorSpotlightProps {
  creators: SpotlightCreator[];
  isLoading?: boolean;
  onFollow: (userId: string) => void;
  onUnfollow: (userId: string) => void;
  className?: string;
}

function CreatorSkeleton() {
  return (
    <div className="flex-shrink-0 w-[180px] md:w-[200px] rounded-xl border border-border-subtle bg-background-surface overflow-hidden animate-pulse">
      <div className="p-4 pb-2 flex flex-col items-center">
        <div className="w-14 h-14 rounded-full bg-background-elevated" />
        <div className="mt-2 h-4 w-20 bg-background-elevated rounded" />
        <div className="mt-1 h-3 w-16 bg-background-elevated rounded" />
      </div>
      <div className="grid grid-cols-4 gap-0.5 px-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="aspect-square bg-background-elevated rounded-sm" />
        ))}
      </div>
      <div className="p-3">
        <div className="h-8 bg-background-elevated rounded-lg" />
      </div>
    </div>
  );
}

export function CreatorSpotlight({
  creators,
  isLoading,
  onFollow,
  onUnfollow,
  className,
}: CreatorSpotlightProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const scrollAmount = 220;
    scrollRef.current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  };

  return (
    <section className={cn('relative', className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">Community Spotlight</h2>
          <p className="text-sm text-text-muted">Discover talented creators</p>
        </div>
        
        {/* Scroll Buttons */}
        <div className="flex gap-2">
          <button
            onClick={() => scroll('left')}
            className="w-8 h-8 rounded-full border border-border-subtle bg-background-surface flex items-center justify-center text-text-muted hover:text-text-primary hover:border-border-default transition-colors"
            aria-label="Scroll left"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <button
            onClick={() => scroll('right')}
            className="w-8 h-8 rounded-full border border-border-subtle bg-background-surface flex items-center justify-center text-text-muted hover:text-text-primary hover:border-border-default transition-colors"
            aria-label="Scroll right"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        </div>
      </div>

      {/* Scrollable Creator Cards */}
      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-thin scrollbar-thumb-border-subtle scrollbar-track-transparent"
      >
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => <CreatorSkeleton key={i} />)
        ) : creators.length > 0 ? (
          creators.map((creator) => (
            <CreatorCard
              key={creator.id}
              creator={creator}
              onFollow={onFollow}
              onUnfollow={onUnfollow}
            />
          ))
        ) : (
          <div className="flex-1 py-8 text-center text-text-muted">
            No creators to spotlight yet. Be the first to share your work!
          </div>
        )}
      </div>
    </section>
  );
}
